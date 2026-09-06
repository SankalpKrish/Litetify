use super::req::{
    call_api, get_json, query_params, to_refs, ArtistAlbums, ArtistRelatedArtists, ArtistTopTracks,
    SpotifyArtist,
};
use serde_json::Value;

#[tauri::command]
pub async fn api_get_artist(client_id: String, artist_id: String) -> Result<SpotifyArtist, String> {
    let path = format!("/artists/{artist_id}");
    get_json(&client_id, &path, &[]).await
}

#[tauri::command]
pub async fn api_get_artist_top_tracks(
    client_id: String,
    artist_id: String,
    market: Option<String>,
) -> Result<ArtistTopTracks, String> {
    let path = format!("/artists/{artist_id}/top-tracks");
    // Only pass `market` when the caller supplies a real ISO 3166-1 alpha-2 code.
    // Otherwise omit it so Spotify uses the user account's country (the legacy
    // `from_token` value is rejected with HTTP 400 by the current API).
    match market {
        Some(m) => get_json(&client_id, &path, &[("market", m.as_str())]).await,
        None => get_json(&client_id, &path, &[]).await,
    }
}

#[tauri::command]
pub async fn api_get_artist_albums(
    client_id: String,
    artist_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<ArtistAlbums, String> {
    let path = format!("/artists/{artist_id}/albums");
    let mut params = query_params(limit, offset);
    params.insert(0, ("include_groups", "album,single".into()));
    let refs = to_refs(&params);
    get_json(&client_id, &path, &refs).await
}

#[tauri::command]
pub async fn api_get_related_artists(
    client_id: String,
    artist_id: String,
) -> Result<ArtistRelatedArtists, String> {
    let path = format!("/artists/{artist_id}/related-artists");
    get_json(&client_id, &path, &[]).await
}

#[tauri::command]
pub async fn api_check_follow_artist(client_id: String, artist_id: String) -> Result<bool, String> {
    let res: Vec<bool> = call_api(
        &client_id,
        reqwest::Method::GET,
        "/me/following/contains",
        &[("type", "artist"), ("ids", &artist_id)],
        None,
    )
    .await?;
    Ok(res.first().copied().unwrap_or(false))
}

#[tauri::command]
pub async fn api_follow_artist(client_id: String, artist_id: String) -> Result<(), String> {
    call_api::<Option<Value>>(
        &client_id,
        reqwest::Method::PUT,
        "/me/following",
        &[("type", "artist"), ("ids", &artist_id)],
        None,
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn api_unfollow_artist(client_id: String, artist_id: String) -> Result<(), String> {
    call_api::<Option<Value>>(
        &client_id,
        reqwest::Method::DELETE,
        "/me/following",
        &[("type", "artist"), ("ids", &artist_id)],
        None,
    )
    .await?;
    Ok(())
}
