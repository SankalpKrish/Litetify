use super::req::{
    get_json, query_params, to_refs, RecentlyPlayed, SpotifyUserProfile, TopArtists, TopTracks,
};

#[tauri::command]
pub async fn api_get_me(client_id: String) -> Result<SpotifyUserProfile, String> {
    get_json(&client_id, "/me", &[]).await
}

#[tauri::command]
pub async fn api_get_top_artists(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
    #[allow(non_snake_case)] timeRange: Option<String>,
) -> Result<TopArtists, String> {
    let mut params = query_params(limit, offset);
    params.insert(
        0,
        (
            "time_range",
            timeRange.unwrap_or_else(|| "medium_term".into()),
        ),
    );
    let refs = to_refs(&params);
    get_json(&client_id, "/me/top/artists", &refs).await
}

#[tauri::command]
pub async fn api_get_top_tracks(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
    #[allow(non_snake_case)] timeRange: Option<String>,
) -> Result<TopTracks, String> {
    let mut params = query_params(limit, offset);
    params.insert(
        0,
        (
            "time_range",
            timeRange.unwrap_or_else(|| "medium_term".into()),
        ),
    );
    let refs = to_refs(&params);
    get_json(&client_id, "/me/top/tracks", &refs).await
}

#[tauri::command]
pub async fn api_get_recently_played(
    client_id: String,
    limit: Option<i32>,
) -> Result<RecentlyPlayed, String> {
    let params = query_params(limit, None);
    let refs = to_refs(&params);
    get_json(&client_id, "/me/player/recently-played", &refs).await
}
