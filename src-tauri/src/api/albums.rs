use super::req::{get_json, SpotifyAlbum};

#[tauri::command]
pub async fn api_get_album(client_id: String, album_id: String) -> Result<SpotifyAlbum, String> {
    let path = format!("/albums/{album_id}");
    get_json(&client_id, &path, &[]).await
}
