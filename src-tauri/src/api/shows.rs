use super::req::{
    call_api, get_json, query_params, to_refs, ShowEpisodesPage, SpotifyShow, SpotifyShowPage,
};
use serde_json::Value;

#[tauri::command]
pub async fn api_get_saved_shows(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<SpotifyShowPage, String> {
    let params = query_params(limit, offset);
    let refs = to_refs(&params);
    get_json(&client_id, "/me/shows", &refs).await
}

#[tauri::command]
pub async fn api_get_show(client_id: String, show_id: String) -> Result<SpotifyShow, String> {
    let path = format!("/shows/{show_id}");
    get_json(&client_id, &path, &[]).await
}

#[tauri::command]
pub async fn api_get_show_episodes(
    client_id: String,
    show_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<ShowEpisodesPage, String> {
    let path = format!("/shows/{show_id}/episodes");
    let params = query_params(limit, offset);
    let refs = to_refs(&params);
    get_json(&client_id, &path, &refs).await
}

#[tauri::command]
pub async fn api_save_show(client_id: String, show_id: String) -> Result<(), String> {
    call_api::<Option<Value>>(
        &client_id,
        reqwest::Method::PUT,
        "/me/shows",
        &[],
        Some(serde_json::json!({ "ids": [show_id] })),
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn api_remove_show(client_id: String, show_id: String) -> Result<(), String> {
    call_api::<Option<Value>>(
        &client_id,
        reqwest::Method::DELETE,
        "/me/shows",
        &[("ids", &show_id)],
        None,
    )
    .await?;
    Ok(())
}
