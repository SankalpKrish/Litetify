pub mod api;
pub mod auth;
pub mod mods;
pub mod playback;

use mods::ModEntry;

#[tauri::command]
fn ping() -> String {
    format!("Litetify core v{} ready", env!("CARGO_PKG_VERSION"))
}

#[tauri::command]
fn scan_mods() -> Vec<ModEntry> {
    mods::scan_mods()
}

#[tauri::command]
fn read_mod_file(mod_path: String, file_path: String) -> Result<String, String> {
    mods::read_mod_file(&mod_path, &file_path)
}

#[tauri::command]
fn get_mods_path() -> String {
    mods::mods_path().to_string_lossy().to_string()
}

#[tauri::command]
fn open_mods_folder() -> Result<(), String> {
    let path = mods::mods_path();
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create mods dir: {e}"))?;
    }
    open::that(&path).map_err(|e| format!("Failed to open mods folder: {e}"))
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    let p = std::path::PathBuf::from(&path);
    open::that(&p).map_err(|e| format!("Failed to open path: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("warn")).init();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            scan_mods,
            read_mod_file,
            get_mods_path,
            open_mods_folder,
            open_path,
            auth::login,
            auth::logout,
            auth::check_auth,
            auth::get_valid_token,
            auth::get_profile,
            auth::check_reauth_needed,
            auth::get_granted_scopes_command,
            api::profile::api_get_me,
            api::playlists::api_create_playlist,
            api::playlists::api_update_playlist,
            api::playlists::api_get_playlists,
            api::playlists::api_get_playlist,
            api::playlists::api_get_playlist_tracks,
            api::library::api_get_liked_tracks,
            api::albums::api_get_album,
            api::artists::api_get_artist,
            api::artists::api_get_artist_top_tracks,
            api::artists::api_get_artist_albums,
            api::artists::api_get_related_artists,
            api::search::api_search,
            api::search::api_get_recommendations,
            api::player::api_get_currently_playing,
            api::devices::api_transfer_playback,
            api::devices::api_get_available_devices,
            api::player::api_play,
            api::player::api_pause,
            api::player::api_next,
            api::player::api_previous,
            api::player::api_set_shuffle,
            api::player::api_set_repeat,
            api::player::api_add_to_queue,
            api::library::api_save_to_library,
            api::library::api_remove_from_library,
            api::library::api_check_library,
            api::playlists::api_add_to_playlist,
            api::playlists::api_remove_from_playlist,
            api::artists::api_check_follow_artist,
            api::artists::api_follow_artist,
            api::artists::api_unfollow_artist,
            api::playlists::api_follow_playlist,
            api::playlists::api_unfollow_playlist,
            api::profile::api_get_top_artists,
            api::profile::api_get_top_tracks,
            api::shows::api_get_saved_shows,
            api::shows::api_get_show,
            api::shows::api_get_show_episodes,
            api::shows::api_save_show,
            api::shows::api_remove_show,
            api::profile::api_get_recently_played,
            playback::websdk::set_active_device,
            playback::websdk::get_active_device,
            playback::websdk::engine_play,
            playback::websdk::engine_pause,
            playback::websdk::engine_resume,
            playback::websdk::engine_seek,
            playback::websdk::engine_set_volume,
            playback::websdk::engine_next,
            playback::websdk::engine_previous,
            playback::websdk::engine_toggle_shuffle,
            playback::websdk::engine_cycle_repeat,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Litetify");
}
