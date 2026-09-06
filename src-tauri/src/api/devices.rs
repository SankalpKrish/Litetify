use super::req::{get_json, Device};

#[tauri::command]
pub async fn api_transfer_playback(
    client_id: String,
    device_ids: Vec<String>,
    play: Option<bool>,
) -> Result<(), String> {
    use super::req::build_headers;
    use super::req::BASE_URL;
    use crate::auth::tokens;

    let body = serde_json::json!({
        "device_ids": device_ids,
        "play": play.unwrap_or(false),
    });
    let token = tokens::get_valid_access_token(&client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let resp = client
        .put(format!("{BASE_URL}/me/player"))
        .headers(headers)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("transfer failed: {e}"))?;
    if resp.status().is_success() {
        Ok(())
    } else {
        let status = resp.status();
        let body_text = resp
            .text()
            .await
            .unwrap_or_else(|_| "(no body)".to_string());
        Err(format!("transfer failed ({status}): {body_text}"))
    }
}

#[tauri::command]
pub async fn api_get_available_devices(client_id: String) -> Result<Vec<Device>, String> {
    #[derive(serde::Deserialize)]
    struct DeviceResponse {
        devices: Vec<Device>,
    }
    let resp: DeviceResponse = get_json(&client_id, "/me/player/devices", &[]).await?;
    Ok(resp.devices)
}
