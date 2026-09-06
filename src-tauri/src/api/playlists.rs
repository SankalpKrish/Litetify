use super::req::{
    call_api, get_json, query_params, to_refs, PlaylistDetail, PlaylistTracks, SpotifyPlaylists,
    SpotifyUserProfile,
};
use serde_json::Value;

#[tauri::command]
pub async fn api_create_playlist(
    client_id: String,
    name: String,
    description: Option<String>,
    public: Option<bool>,
) -> Result<(), String> {
    // Get current user's ID
    let profile: SpotifyUserProfile = get_json(&client_id, "/me", &[]).await?;
    let path = format!("/users/{}/playlists", profile.id);
    let mut body = serde_json::json!({ "name": name });
    if let Some(d) = description {
        body["description"] = serde_json::json!(d);
    }
    if let Some(p) = public {
        body["public"] = serde_json::json!(p);
    }
    call_api::<Option<Value>>(&client_id, reqwest::Method::POST, &path, &[], Some(body)).await?;
    Ok(())
}

#[tauri::command]
pub async fn api_update_playlist(
    client_id: String,
    playlist_id: String,
    name: Option<String>,
    description: Option<String>,
    public: Option<bool>,
) -> Result<(), String> {
    let path = format!("/playlists/{playlist_id}");
    let mut body = serde_json::json!({});
    if let Some(n) = name {
        body["name"] = serde_json::json!(n);
    }
    if let Some(d) = description {
        body["description"] = serde_json::json!(d);
    }
    if let Some(p) = public {
        body["public"] = serde_json::json!(p);
    }
    call_api::<Option<Value>>(&client_id, reqwest::Method::PUT, &path, &[], Some(body)).await?;
    Ok(())
}

#[tauri::command]
pub async fn api_get_playlists(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<SpotifyPlaylists, String> {
    let params = query_params(limit, offset);
    let refs = to_refs(&params);
    get_json(&client_id, "/me/playlists", &refs).await
}

#[tauri::command]
pub async fn api_get_playlist(
    client_id: String,
    playlist_id: String,
    fields: Option<String>,
) -> Result<PlaylistDetail, String> {
    let path = format!("/playlists/{playlist_id}");
    let params: &[(&str, &str)] = match &fields {
        Some(f) => &[("fields", f.as_str())],
        None => &[],
    };
    get_json(&client_id, &path, params).await
}

#[tauri::command]
pub async fn api_get_playlist_tracks(
    client_id: String,
    playlist_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<PlaylistTracks, String> {
    // Use `/items` (not the removed `/tracks`): the Feb/Mar 2026 dev-mode
    // migration removed `GET /playlists/{id}/tracks`, which now returns 403.
    let path = format!("/playlists/{playlist_id}/items");
    // `market` is intentionally omitted: with a user access token Spotify applies
    // the account's country automatically. The legacy `from_token` value is no
    // longer accepted by the endpoint validator and returns HTTP 400.
    let params = query_params(limit, offset);
    let refs = to_refs(&params);
    get_json(&client_id, &path, &refs).await
}

#[tauri::command]
pub async fn api_add_to_playlist(
    client_id: String,
    playlist_id: String,
    uris: Vec<String>,
) -> Result<(), String> {
    use super::req::build_headers;
    use super::req::BASE_URL;
    use crate::auth::tokens;

    let token = tokens::get_valid_access_token(&client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let url = format!("{BASE_URL}/playlists/{playlist_id}/items");
    let body = serde_json::json!({ "uris": uris });
    let resp = client
        .post(&url)
        .headers(headers)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("add to playlist request failed: {e}"))?;
    if resp.status().is_success() || resp.status().as_u16() == 201 {
        Ok(())
    } else {
        let status = resp.status();
        let body_text = resp
            .text()
            .await
            .unwrap_or_else(|_| "(no body)".to_string());
        Err(format!("add to playlist failed ({status}): {body_text}"))
    }
}

#[tauri::command]
pub async fn api_remove_from_playlist(
    client_id: String,
    playlist_id: String,
    uris: Vec<String>,
) -> Result<(), String> {
    use super::req::build_headers;
    use super::req::BASE_URL;
    use crate::auth::tokens;

    let token = tokens::get_valid_access_token(&client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let url = format!("{BASE_URL}/playlists/{playlist_id}/items");
    let items: Vec<serde_json::Value> = uris
        .iter()
        .map(|u| serde_json::json!({ "uri": u }))
        .collect();
    let body = serde_json::json!({ "items": items });
    let resp = client
        .delete(&url)
        .headers(headers)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("remove from playlist request failed: {e}"))?;
    if resp.status().is_success() || resp.status().as_u16() == 200 {
        Ok(())
    } else {
        let status = resp.status();
        let body_text = resp
            .text()
            .await
            .unwrap_or_else(|_| "(no body)".to_string());
        Err(format!(
            "remove from playlist failed ({status}): {body_text}"
        ))
    }
}

#[tauri::command]
pub async fn api_follow_playlist(client_id: String, playlist_id: String) -> Result<(), String> {
    call_api::<Option<Value>>(
        &client_id,
        reqwest::Method::PUT,
        &format!("/playlists/{playlist_id}/followers"),
        &[],
        Some(serde_json::json!({ "public": false })),
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn api_unfollow_playlist(client_id: String, playlist_id: String) -> Result<(), String> {
    call_api::<Option<Value>>(
        &client_id,
        reqwest::Method::DELETE,
        &format!("/playlists/{playlist_id}/followers"),
        &[],
        None,
    )
    .await?;
    Ok(())
}
