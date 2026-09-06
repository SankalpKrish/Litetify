// ── Domain API modules ──
pub(crate) mod albums;
pub(crate) mod artists;
pub(crate) mod devices;
pub(crate) mod library;
pub(crate) mod player;
pub(crate) mod playlists;
pub(crate) mod profile;
pub(crate) mod search;
pub(crate) mod shows;

// ── Shared helpers & types (private module) ──
mod req;

// ── Re-exports so generate_handler! paths (api::api_*) resolve ──
pub use albums::api_get_album;
pub use artists::{
    api_check_follow_artist, api_follow_artist, api_get_artist, api_get_artist_albums,
    api_get_artist_top_tracks, api_get_related_artists, api_unfollow_artist,
};
pub use devices::{api_get_available_devices, api_transfer_playback};
pub use library::{
    api_check_library, api_get_liked_tracks, api_remove_from_library, api_save_to_library,
};
pub use player::{
    api_add_to_queue, api_get_currently_playing, api_next, api_pause, api_play, api_previous,
    api_set_repeat, api_set_shuffle,
};
pub use playlists::{
    api_add_to_playlist, api_create_playlist, api_follow_playlist, api_get_playlist,
    api_get_playlist_tracks, api_get_playlists, api_remove_from_playlist, api_unfollow_playlist,
    api_update_playlist,
};
pub use profile::{api_get_me, api_get_recently_played, api_get_top_artists, api_get_top_tracks};
pub use search::{api_get_recommendations, api_search};
pub use shows::{
    api_get_saved_shows, api_get_show, api_get_show_episodes, api_remove_show, api_save_show,
};
