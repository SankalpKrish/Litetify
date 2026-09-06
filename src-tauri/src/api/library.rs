use super::req::{get_json, player_control, LikedTracks};

#[tauri::command]
pub async fn api_get_liked_tracks(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<LikedTracks, String> {
    let params = super::req::query_params(limit, offset);
    let refs = super::req::to_refs(&params);
    get_json(&client_id, "/me/tracks", &refs).await
}

/// Save items to the user's library (migrated generic endpoint).
/// `uris` is a comma-separated list of Spotify URIs.
#[tauri::command]
pub async fn api_save_to_library(client_id: String, uris: String) -> Result<(), String> {
    player_control(
        &client_id,
        reqwest::Method::PUT,
        "/me/library",
        &[("uris", uris.as_str())],
        "save to library",
    )
    .await
}

#[tauri::command]
pub async fn api_remove_from_library(client_id: String, uris: String) -> Result<(), String> {
    player_control(
        &client_id,
        reqwest::Method::DELETE,
        "/me/library",
        &[("uris", uris.as_str())],
        "remove from library",
    )
    .await
}

/// Returns one bool per URI indicating whether it is saved in the library.
#[tauri::command]
pub async fn api_check_library(client_id: String, uris: String) -> Result<Vec<bool>, String> {
    get_json(
        &client_id,
        "/me/library/contains",
        &[("uris", uris.as_str())],
    )
    .await
}
