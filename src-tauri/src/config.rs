use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

/// Persistent user-configurable settings for Litetify.
///
/// All config is stored in a single JSON file and managed through
/// the Tauri store plugin. This replaces the ad-hoc localStorage
/// usage that was scattered across the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LitetifyConfig {
    /// Spotify Developer Client ID for PKCE auth.
    pub client_id: Option<String>,
    /// Which playback engine to use: "websdk" or "librespot".
    pub engine_type: String,
    /// Whether the left sidebar is collapsed.
    pub sidebar_collapsed: bool,
    /// Last known volume level (0.0–1.0).
    pub volume: f64,
    /// Whether shuffle is enabled.
    pub shuffle: bool,
    /// Repeat state: "off", "context", or "track".
    pub repeat: String,
    /// Pinned sidebar items (Spotify URIs).
    pub pins: Vec<String>,
    /// Last selected view in the sidebar navigation.
    pub last_view: Option<String>,
}

impl Default for LitetifyConfig {
    fn default() -> Self {
        Self {
            client_id: None,
            engine_type: "websdk".to_string(),
            sidebar_collapsed: false,
            volume: 0.7,
            shuffle: false,
            repeat: "off".to_string(),
            pins: Vec::new(),
            last_view: None,
        }
    }
}

const STORE_FILE: &str = "config.json";

fn load_config(app: &AppHandle) -> Result<LitetifyConfig, String> {
    let store = app.store(STORE_FILE).map_err(|e| format!("store error: {e}"))?;
    // Try JSON deserialization from the store.
    // The store stores individual key-value pairs, so we serialize our config
    // as a single JSON string under the "config" key.
    let data = store
        .get("config")
        .and_then(|v| v.as_str().map(|s| s.to_string()));
    match data {
        Some(json_str) => {
            serde_json::from_str(&json_str).map_err(|e| format!("config parse error: {e}"))
        }
        None => Ok(LitetifyConfig::default()),
    }
}

fn save_config(app: &AppHandle, config: &LitetifyConfig) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| format!("store error: {e}"))?;
    let json_str =
        serde_json::to_string(config).map_err(|e| format!("config serialize error: {e}"))?;
    let value: serde_json::Value =
        serde_json::to_value(&json_str).map_err(|e| format!("value error: {e}"))?;
    store.set("config", value);
    store.save().map_err(|e| format!("config save error: {e}"))?;
    Ok(())
}

// ── Tauri commands ──

#[tauri::command]
pub async fn get_config(app: AppHandle) -> Result<LitetifyConfig, String> {
    load_config(&app)
}

#[tauri::command]
pub async fn set_config(app: AppHandle, config: LitetifyConfig) -> Result<(), String> {
    save_config(&app, &config)
}

#[tauri::command]
pub async fn reset_config(app: AppHandle) -> Result<LitetifyConfig, String> {
    let default = LitetifyConfig::default();
    save_config(&app, &default)?;
    Ok(default)
}
