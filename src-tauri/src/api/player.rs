use super::req::BASE_URL;
use super::req::{build_headers, player_control, CurrentlyPlaying};
use crate::auth::tokens;

#[tauri::command]
pub async fn api_play(
    client_id: String,
    device_id: String,
    uri: Option<String>,
    uris: Option<Vec<String>>,
    context_uri: Option<String>,
    offset_uri: Option<String>,
) -> Result<(), String> {
    let token = tokens::get_valid_access_token(&client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let url = format!("{BASE_URL}/me/player/play");

    // Build a queue so next/previous work:
    //  - context_uri (playlist/album) + optional offset, OR
    //  - an explicit uris list + optional offset (used when there is no Spotify
    //    context, e.g. search results or Liked Songs), OR
    //  - a single uri (no queue — last resort).
    let body = if let Some(ctx) = context_uri {
        match offset_uri {
            Some(off) => serde_json::json!({ "context_uri": ctx, "offset": { "uri": off } }),
            None => serde_json::json!({ "context_uri": ctx }),
        }
    } else if let Some(list) = uris {
        match offset_uri {
            Some(off) => serde_json::json!({ "uris": list, "offset": { "uri": off } }),
            None => serde_json::json!({ "uris": list }),
        }
    } else if let Some(u) = uri {
        serde_json::json!({ "uris": [u] })
    } else {
        serde_json::json!({})
    };

    let resp = client
        .put(&url)
        .headers(headers)
        .query(&[("device_id", &device_id)])
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("play request failed: {e}"))?;

    if resp.status().is_success() || resp.status().as_u16() == 204 {
        Ok(())
    } else {
        let status = resp.status();
        let body_text = resp
            .text()
            .await
            .unwrap_or_else(|_| "(no body)".to_string());
        Err(format!("play failed ({status}): {body_text}"))
    }
}

#[tauri::command]
pub async fn api_pause(client_id: String, device_id: String) -> Result<(), String> {
    use reqwest::header::CONTENT_LENGTH;

    let token = tokens::get_valid_access_token(&client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let url = format!("{BASE_URL}/me/player/pause");

    let resp = client
        .put(&url)
        .headers(headers)
        .query(&[("device_id", &device_id)])
        .header(CONTENT_LENGTH, "0")
        .body(Vec::<u8>::new())
        .send()
        .await
        .map_err(|e| format!("pause request failed: {e}"))?;

    if resp.status().is_success() || resp.status().as_u16() == 204 {
        Ok(())
    } else {
        let status = resp.status();
        let body_text = resp
            .text()
            .await
            .unwrap_or_else(|_| "(no body)".to_string());
        Err(format!("pause failed ({status}): {body_text}"))
    }
}

#[tauri::command]
pub async fn api_next(client_id: String, device_id: String) -> Result<(), String> {
    player_control(
        &client_id,
        reqwest::Method::POST,
        "/me/player/next",
        &[("device_id", device_id.as_str())],
        "next",
    )
    .await
}

#[tauri::command]
pub async fn api_previous(client_id: String, device_id: String) -> Result<(), String> {
    player_control(
        &client_id,
        reqwest::Method::POST,
        "/me/player/previous",
        &[("device_id", device_id.as_str())],
        "previous",
    )
    .await
}

#[tauri::command]
pub async fn api_set_shuffle(
    client_id: String,
    device_id: String,
    state: bool,
) -> Result<(), String> {
    let state_str = if state { "true" } else { "false" };
    player_control(
        &client_id,
        reqwest::Method::PUT,
        "/me/player/shuffle",
        &[("state", state_str), ("device_id", device_id.as_str())],
        "shuffle",
    )
    .await
}

#[tauri::command]
pub async fn api_set_repeat(
    client_id: String,
    device_id: String,
    state: String,
) -> Result<(), String> {
    // state: "off" | "context" | "track"
    player_control(
        &client_id,
        reqwest::Method::PUT,
        "/me/player/repeat",
        &[("state", state.as_str()), ("device_id", device_id.as_str())],
        "repeat",
    )
    .await
}

#[tauri::command]
pub async fn api_add_to_queue(
    client_id: String,
    uri: String,
    device_id: Option<String>,
) -> Result<(), String> {
    let mut q: Vec<(&str, &str)> = vec![("uri", uri.as_str())];
    if let Some(d) = &device_id {
        q.push(("device_id", d.as_str()));
    }
    player_control(
        &client_id,
        reqwest::Method::POST,
        "/me/player/queue",
        &q,
        "add to queue",
    )
    .await
}

#[tauri::command]
pub async fn api_get_currently_playing(
    client_id: String,
) -> Result<Option<CurrentlyPlaying>, String> {
    use super::req::get_json;
    // `market` omitted: the user access token already scopes results to the
    // account's country; `from_token` is no longer an accepted value.
    // Returns None when Spotify replies 204 (nothing playing) -> empty body -> null.
    get_json(&client_id, "/me/player/currently-playing", &[]).await
}
