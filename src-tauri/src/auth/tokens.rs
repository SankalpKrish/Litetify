use chrono::Utc;
use keyring::Entry;
use serde::{Deserialize, Serialize};

const KEYRING_SERVICE: &str = "com.litetify.app";
const KEYRING_USER: &str = "spotify";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    #[serde(default)]
    pub refresh_token: Option<String>,
    #[serde(default)]
    pub scope: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
    #[serde(default)]
    pub granted_scopes: Vec<String>,
}

/// Store tokens and merge granted scopes.
/// NOTE: This reads existing scopes from keyring to merge with new ones.
/// This is intentional — it preserves historical consent across re-auth flows.
pub fn store_tokens(response: &TokenResponse) -> Result<(), String> {
    let refresh = response
        .refresh_token
        .clone()
        .ok_or("no refresh_token in response")?;

    // Parse scopes from response and merge with existing granted scopes
    let new_scopes: Vec<String> = response
        .scope
        .as_ref()
        .map(|s| s.split_whitespace().map(String::from).collect())
        .unwrap_or_default();

    let mut existing_scopes = load_tokens().map(|t| t.granted_scopes).unwrap_or_default();
    for scope in &new_scopes {
        if !existing_scopes.contains(scope) {
            existing_scopes.push(scope.clone());
        }
    }

    let stored = StoredTokens {
        access_token: response.access_token.clone(),
        refresh_token: refresh,
        expires_at: Utc::now().timestamp() + response.expires_in as i64,
        granted_scopes: existing_scopes,
    };

    let json = serde_json::to_string(&stored).map_err(|e| e.to_string())?;
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;
    entry.set_password(&json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_tokens() -> Result<StoredTokens, String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;
    let json = entry.get_password().map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

pub fn clear_tokens() -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;
    entry.delete_password().map_err(|e| e.to_string())
}

pub fn tokens_exist() -> bool {
    load_tokens().is_ok()
}

pub fn is_token_expired(stored: &StoredTokens) -> bool {
    Utc::now().timestamp() >= stored.expires_at - 60
}

/// Check if a scope has been previously granted
pub fn is_scope_granted(scope: &str) -> bool {
    load_tokens()
        .map(|t| t.granted_scopes.iter().any(|s| s == scope))
        .unwrap_or(false)
}

/// Get all historically granted scopes
pub fn get_granted_scopes() -> Vec<String> {
    load_tokens().map(|t| t.granted_scopes).unwrap_or_default()
}

pub(crate) async fn do_refresh(
    token_url: &str,
    client_id: &str,
    refresh_token: &str,
) -> Result<TokenResponse, String> {
    let client = reqwest::Client::new();
    let params = [
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
        ("client_id", client_id),
    ];

    let resp = client
        .post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("refresh request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp
            .text()
            .await
            .unwrap_or_else(|_| "(no body)".to_string());
        return Err(format!("refresh failed ({status}): {body}"));
    }

    resp.json::<TokenResponse>()
        .await
        .map_err(|e| format!("refresh parse failed: {e}"))
}

pub async fn refresh_access_token(
    client_id: &str,
    refresh_token: &str,
) -> Result<TokenResponse, String> {
    do_refresh(
        "https://accounts.spotify.com/api/token",
        client_id,
        refresh_token,
    )
    .await
}

pub(crate) async fn do_get_valid_access_token(
    token_url: &str,
    client_id: &str,
) -> Result<String, String> {
    let stored = load_tokens()?;

    if is_token_expired(&stored) {
        let new_tokens = do_refresh(token_url, client_id, &stored.refresh_token).await?;
        let mut tokens_to_store = new_tokens;
        if tokens_to_store.refresh_token.is_none() {
            tokens_to_store.refresh_token = Some(stored.refresh_token.clone());
        }
        store_tokens(&tokens_to_store)?;
        Ok(tokens_to_store.access_token)
    } else {
        Ok(stored.access_token)
    }
}

pub async fn get_valid_access_token(client_id: &str) -> Result<String, String> {
    do_get_valid_access_token("https://accounts.spotify.com/api/token", client_id).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    // -----------------------------------------------------------------------
    // Serialization / expiry tests (pure logic, no I/O)
    // -----------------------------------------------------------------------

    #[test]
    fn test_token_serde_roundtrip() {
        let response = TokenResponse {
            access_token: "abc".into(),
            token_type: "Bearer".into(),
            expires_in: 3600,
            refresh_token: Some("def".into()),
            scope: Some("streaming".into()),
        };

        let stored = StoredTokens {
            access_token: response.access_token.clone(),
            refresh_token: response.refresh_token.clone().unwrap(),
            expires_at: Utc::now().timestamp() + response.expires_in as i64,
            granted_scopes: vec!["streaming".into(), "user-read-email".into()],
        };

        let json = serde_json::to_string(&stored).unwrap();
        let deserialized: StoredTokens = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.access_token, "abc");
        assert_eq!(deserialized.refresh_token, "def");
    }

    #[test]
    fn test_token_expired_check() {
        let future = StoredTokens {
            access_token: "a".into(),
            refresh_token: "r".into(),
            expires_at: Utc::now().timestamp() + 3600,
            granted_scopes: vec![],
        };
        assert!(!is_token_expired(&future));

        let past = StoredTokens {
            access_token: "a".into(),
            refresh_token: "r".into(),
            expires_at: Utc::now().timestamp() - 100,
            granted_scopes: vec![],
        };
        assert!(is_token_expired(&past));
    }

    #[test]
    fn test_is_token_expired_respects_grace_period() {
        // 61s before expiry should still be valid (60s grace window)
        let almost_expired = StoredTokens {
            access_token: "a".into(),
            refresh_token: "r".into(),
            expires_at: Utc::now().timestamp() + 61,
            granted_scopes: vec![],
        };
        assert!(!is_token_expired(&almost_expired));

        // 59s before expiry should be expired (within the 60s grace)
        let expired_early = StoredTokens {
            access_token: "a".into(),
            refresh_token: "r".into(),
            expires_at: Utc::now().timestamp() + 59,
            granted_scopes: vec![],
        };
        assert!(is_token_expired(&expired_early));
    }

    #[test]
    fn test_serde_defaults_missing_fields() {
        // granted_scopes and some optional TokenResponse fields
        let json = r#"{
            "access_token": "tok",
            "refresh_token": "ref",
            "expires_at": 1700000000
        }"#;
        let stored: StoredTokens = serde_json::from_str(json).unwrap();
        assert_eq!(stored.access_token, "tok");
        assert!(stored.granted_scopes.is_empty());
    }

    // -----------------------------------------------------------------------
    // Token refresh HTTP tests (mockito server, separate tokio runtime)
    // -----------------------------------------------------------------------

    /// Serialize tests that touch the real OS keyring so they don't race on shared state.
    static KEYRING_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    fn mock_token_server() -> (mockito::ServerGuard, mockito::Mock) {
        let mut server = mockito::Server::new();
        let mock = server
            .mock("POST", mockito::Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(
                r#"{"access_token":"refreshed","token_type":"Bearer","expires_in":3600,"scope":"streaming"}"#,
            )
            .create();
        (server, mock)
    }

    #[test]
    fn test_refresh_success() {
        let (server, mock) = mock_token_server();
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let result = do_refresh(&server.url(), "client1", "refresh_token_1")
                .await
                .unwrap();
            assert_eq!(result.access_token, "refreshed");
            assert_eq!(result.token_type, "Bearer");
            assert_eq!(result.expires_in, 3600);
        });
        mock.assert();
    }

    #[test]
    fn test_refresh_fails_with_bad_request() {
        let mut server = mockito::Server::new();
        let mock = server
            .mock("POST", mockito::Matcher::Any)
            .with_status(400)
            .with_header("content-type", "application/json")
            .with_body(r#"{"error":"invalid_grant","error_description":"Invalid refresh token"}"#)
            .create();

        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let err = do_refresh(&server.url(), "client1", "bad_token")
                .await
                .unwrap_err();
            assert!(
                err.contains("refresh failed"),
                "expected refresh failed, got: {err}"
            );
        });
        mock.assert();
    }

    #[test]
    fn test_refresh_fails_with_server_error() {
        let mut server = mockito::Server::new();
        let mock = server
            .mock("POST", mockito::Matcher::Any)
            .with_status(500)
            .with_header("content-type", "application/json")
            .with_body(r#"{"error":"server_error"}"#)
            .create();

        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let err = do_refresh(&server.url(), "client1", "tok")
                .await
                .unwrap_err();
            assert!(err.contains("500"), "expected 500 error, got: {err}");
        });
        mock.assert();
    }

    #[test]
    fn test_refresh_fails_with_bad_json_response() {
        let mut server = mockito::Server::new();
        let mock = server
            .mock("POST", mockito::Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body("not-json")
            .create();

        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let err = do_refresh(&server.url(), "client1", "tok")
                .await
                .unwrap_err();
            assert!(
                err.contains("refresh parse failed"),
                "expected parse error, got: {err}"
            );
        });
        mock.assert();
    }

    #[tokio::test]
    async fn test_refresh_network_error() {
        let result = do_refresh("http://127.0.0.1:1", "test_client", "some_refresh").await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.contains("refresh request failed"),
            "expected connection error, got: {err}"
        );
    }

    // -----------------------------------------------------------------------
    // Token refresh flow (with real keyring + mockito)
    // Uses a second keyring entry to avoid polluting real app state.
    // -----------------------------------------------------------------------

    const TEST_KEYRING_SERVICE: &str = "com.litetify.test";
    /// Each keyring test uses its own user to avoid parallel-test races.
    fn test_user(name: &str) -> String {
        format!("spotify-test-{name}")
    }

    fn store_tokens_to(
        keyring_svc: &str,
        keyring_user: &str,
        tokens: &StoredTokens,
    ) -> Result<(), String> {
        let json = serde_json::to_string(tokens).map_err(|e| e.to_string())?;
        let entry = Entry::new(keyring_svc, keyring_user).map_err(|e| e.to_string())?;
        entry.set_password(&json).map_err(|e| e.to_string())
    }

    fn load_tokens_from(keyring_svc: &str, keyring_user: &str) -> Result<StoredTokens, String> {
        let entry = Entry::new(keyring_svc, keyring_user).map_err(|e| e.to_string())?;
        let json = entry.get_password().map_err(|e| e.to_string())?;
        serde_json::from_str(&json).map_err(|e| e.to_string())
    }

    fn clear_tokens_from(keyring_svc: &str, keyring_user: &str) -> Result<(), String> {
        let entry = Entry::new(keyring_svc, keyring_user).map_err(|e| e.to_string())?;
        entry.delete_password().map_err(|e| e.to_string())
    }

    #[test]
    fn test_keyring_store_and_load() {
        let user = test_user("store_and_load");
        let _guard = KEYRING_LOCK.lock();
        let _ = clear_tokens_from(TEST_KEYRING_SERVICE, &user);

        let stored = StoredTokens {
            access_token: "test_access".into(),
            refresh_token: "test_refresh".into(),
            expires_at: Utc::now().timestamp() + 3600,
            granted_scopes: vec!["streaming".into(), "user-read-email".into()],
        };

        store_tokens_to(TEST_KEYRING_SERVICE, &user, &stored).unwrap();

        let loaded = load_tokens_from(TEST_KEYRING_SERVICE, &user).unwrap();
        assert_eq!(loaded.access_token, "test_access");
        assert_eq!(loaded.refresh_token, "test_refresh");
        assert_eq!(loaded.granted_scopes.len(), 2);

        clear_tokens_from(TEST_KEYRING_SERVICE, &user).unwrap();
        let gone = load_tokens_from(TEST_KEYRING_SERVICE, &user).is_err();
        assert!(gone);
    }

    #[test]
    fn test_keyring_clear_nonexistent() {
        let user = test_user("clear_nonexistent");
        let _guard = KEYRING_LOCK.lock();
        let _ = clear_tokens_from(TEST_KEYRING_SERVICE, &user);
        let result = clear_tokens_from(TEST_KEYRING_SERVICE, &user);
        assert!(result.is_err(), "clearing non-existent entry should fail");
    }

    #[test]
    fn test_get_valid_access_token_valid_token() {
        let user = test_user("valid_token");
        let _guard = KEYRING_LOCK.lock();
        let _ = clear_tokens_from(TEST_KEYRING_SERVICE, &user);

        let valid = StoredTokens {
            access_token: "current_token".into(),
            refresh_token: "refresh_val".into(),
            expires_at: Utc::now().timestamp() + 3600,
            granted_scopes: vec![],
        };
        store_tokens_to(TEST_KEYRING_SERVICE, &user, &valid).unwrap();

        let loaded = load_tokens_from(TEST_KEYRING_SERVICE, &user).unwrap();
        assert_eq!(loaded.access_token, "current_token");
        assert!(!is_token_expired(&loaded));

        clear_tokens_from(TEST_KEYRING_SERVICE, &user).unwrap();
    }

    #[test]
    fn test_refresh_flow_expired_token() {
        let user = test_user("refresh_flow");
        let _guard = KEYRING_LOCK.lock();
        let _ = clear_tokens_from(TEST_KEYRING_SERVICE, &user);

        let expired = StoredTokens {
            access_token: "old_access".into(),
            refresh_token: "my_refresh_token".into(),
            expires_at: Utc::now().timestamp() - 100,
            granted_scopes: vec![],
        };
        store_tokens_to(TEST_KEYRING_SERVICE, &user, &expired).unwrap();

        let mut server = mockito::Server::new();
        let mock = server
            .mock("POST", mockito::Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(
                r#"{"access_token":"new_access","token_type":"Bearer","expires_in":3600,"refresh_token":"new_refresh","scope":"streaming"}"#,
            )
            .create();

        let loaded = load_tokens_from(TEST_KEYRING_SERVICE, &user).unwrap();
        assert!(is_token_expired(&loaded));

        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let result = do_refresh(&server.url(), "test_client", "my_refresh_token")
                .await
                .unwrap();
            assert_eq!(result.access_token, "new_access");
        });

        mock.assert();
        clear_tokens_from(TEST_KEYRING_SERVICE, &user).unwrap();
    }
}
