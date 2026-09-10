# Litetify API Documentation

## 1. Architecture

All Spotify Web API calls flow through a Rust backend proxy embedded in the Tauri process. The frontend never communicates with Spotify's servers directly.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend (React 19 / TypeScript)                                  │
│                                                                     │
│  ┌────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │  React Query    │───>│  src/lib/api.ts  │───>│  Tauri IPC      │ │
│  │  hooks          │    │  (invoke bridge) │    │  @tauri-apps/   │ │
│  │  src/lib/queries│    │                  │    │  api/core       │ │
│  └────────────────┘    └─────────────────┘    └────────┬────────┘ │
│                                                         │          │
└─────────────────────────────────────────────────────────│──────────┘
                                                          │
                                                    invoke("api_get_*")
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Rust Backend (Tauri process)                                       │
│                                                                     │
│  ┌──────────────────┐    ┌───────────────────┐    ┌──────────────┐ │
│  │  auth::tokens     │    │  api::req::call_api│    │  Spotify     │ │
│  │  (PKCE + keyring) │───>│  (retry logic,    │───>│  Web API     │ │
│  │                   │    │   token injection) │    │  api.spotify │ │
│  └──────────────────┘    └───────────────────┘    │  .com/v1     │ │
│                                                      └──────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Domain Handlers (src-tauri/src/api/)                           │  │
│  │  albums.rs · artists.rs · devices.rs · library.rs · player.rs  │  │
│  │  playlists.rs · profile.rs · search.rs · shows.rs              │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Playback Engine (src-tauri/src/playback/)                      │  │
│  │  websdk.rs - Tauri event-based WebSDK playback control          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────────────────────────────────┐                       │
│  │  auth/ · config.rs · mods/                 │                       │
│  └────────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Layer responsibilities:**

- **React Query hooks** (`src/lib/queries/`) - Cache, refetch, stale-time, and mutation invalidation. All Spotify data goes through `@tanstack/react-query`.
- **API bridge** (`src/lib/api.ts`) - Thin wrappers around `invoke<T>(cmd, args)`. Each function passes the client ID and forwards typed arguments to the Rust handler. Errors are wrapped into real `Error` objects.
- **IPC layer** - Tauri's `invoke_handler` maps command names to Rust functions via `#[tauri::command]`.
- **Rust handlers** (`src-tauri/src/api/`) - Delegates to `api::req::call_api()` for Spotify Web API calls, or handles playback events locally.
- **Proxy client** (`api::req`) - Fetches the access token from the OS keyring, builds HTTP headers, executes Spotify API requests with retry logic, and deserializes responses.
- **Playback engine** (`playback/websdk.rs`) - Uses Tauri's event system (`emit()`) to dispatch playback commands to the frontend's WebSDK player. v1.0.0 ships the WebSDK engine only.

### Module Layout

| Module             | File                 | Responsibility                                              |
| ------------------ | -------------------- | ----------------------------------------------------------- |
| `api::req`         | `api/req.rs`         | Shared HTTP client, retry logic, Spotify API data types     |
| `api::albums`      | `api/albums.rs`      | Album-related endpoints                                     |
| `api::artists`     | `api/artists.rs`     | Artist detail, top tracks, albums, related, follow/unfollow |
| `api::devices`     | `api/devices.rs`     | Available devices, transfer playback                        |
| `api::library`     | `api/library.rs`     | Liked tracks, save/remove/check library                     |
| `api::player`      | `api/player.rs`      | Currently playing, play/pause/skip/shuffle/repeat, queue    |
| `api::playlists`   | `api/playlists.rs`   | CRUD playlists, tracks, follow/unfollow                     |
| `api::profile`     | `api/profile.rs`     | User profile, top artists/tracks, recently played           |
| `api::search`      | `api/search.rs`      | Search, recommendations                                     |
| `api::shows`       | `api/shows.rs`       | Podcasts/shows: saved list, detail, episodes                |
| `auth`             | `auth/`              | PKCE flow, OAuth callback server, token storage/refresh     |
| `playback::websdk` | `playback/websdk.rs` | WebSDK playback control via Tauri events                    |
| `mods`             | `mods/`              | Mod scanning, manifest loading, sandboxed file reads        |
| `config`           | `config.rs`          | Persistent user configuration via tauri-plugin-store        |

---

## 2. Authentication

Litetify uses the **Authorization Code with PKCE** flow (RFC 7636). All authentication is handled transparently in the Rust process - the frontend never touches tokens.

### Flow

1. **Login initiation** - `auth::login()` is called from the frontend via IPC.
2. **PKCE challenge** - A cryptographically random code verifier (43-128 chars, base64url) is generated, and its SHA-256 hash (code challenge) is computed.
3. **Browser redirect** - The Spotify accounts authorization URL is opened in the system browser with `response_type=code`, `code_challenge_method=S256`, and the requested scopes.
4. **Local callback server** - A `tiny_http` server binds to `127.0.0.1:14523` (with automatic port fallback up to +10). It receives the callback with the authorization code and state parameter.
5. **State validation** - The returned state is compared against the generated state to prevent CSRF.
6. **Token exchange** - The authorization code and verifier are exchanged for an access + refresh token pair via POST to `https://accounts.spotify.com/api/token`.
7. **Premium check** - The user's Spotify product type is verified. Only Premium accounts are allowed.
8. **Keychain storage** - Tokens are stored in the OS keyring (service: `com.litetify.app`, user: `spotify`) via the `keyring` crate.

### Token Management

- **Storage**: `StoredTokens` JSON blob in the OS keyring (`keyring` crate), containing `access_token`, `refresh_token`, `expires_at` (UNIX timestamp), and `granted_scopes`.
- **Auto-refresh**: Before every API call, `tokens::get_valid_access_token()` checks if the token is expired (60-second grace window). If expired, it silently refreshes via `https://accounts.spotify.com/api/token` and stores the new tokens.
- **Scope preservation**: Granted scopes are accumulated across re-auth flows - previously authorized scopes are never lost.
- **No manual auth needed**: API functions in `src/lib/api.ts` automatically inject the client ID from auth state. The `req()` helper calls `get_valid_token` internally on every request.

### Scopes

| Category | Scope                         | Required      |
| -------- | ----------------------------- | ------------- |
| Core     | `streaming`                   | Yes           |
| Core     | `user-read-email`             | Yes           |
| Core     | `user-read-private`           | Yes           |
| Core     | `user-read-playback-state`    | Yes           |
| Core     | `user-modify-playback-state`  | Yes           |
| Core     | `user-library-read`           | Yes           |
| Core     | `user-library-modify`         | Yes           |
| Core     | `playlist-read-private`       | Yes           |
| Core     | `playlist-read-collaborative` | Yes           |
| Core     | `playlist-modify-public`      | Yes           |
| Core     | `playlist-modify-private`     | Yes           |
| Stats    | `user-top-read`               | Feature-gated |
| Stats    | `user-read-recently-played`   | Feature-gated |

Scopes are requested based on enabled features. The `check_reauth_needed` command lets the UI detect scope upgrades and prompt re-auth.

### Commands

| Command                      | Signature                                          | Description                                        |
| ---------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| `login`                      | `(client_id, enabled_features?) -> Result<String>` | Initiate PKCE login flow                           |
| `logout`                     | `() -> Result<()>`                                 | Clear stored tokens                                |
| `check_auth`                 | `() -> bool`                                       | Check if tokens exist in keyring                   |
| `get_valid_token`            | `(client_id) -> Result<String>`                    | Get a valid access token (auto-refresh if expired) |
| `get_profile`                | `(client_id) -> Result<Value>`                     | Fetch Spotify user profile                         |
| `check_reauth_needed`        | `(enabled_features) -> Vec<String>`                | Return scopes needing authorization                |
| `get_granted_scopes_command` | `() -> Vec<String>`                                | Get all historically granted scopes                |

---

## 3. IPC Commands Reference

All commands are registered in `src-tauri/src/lib.rs` via `tauri::generate_handler!`. The frontend calls them through `@tauri-apps/api/core`'s `invoke()`.

### System

| Command            | Rust Path          | Args                                  | Returns          | Notes                                      |
| ------------------ | ------------------ | ------------------------------------- | ---------------- | ------------------------------------------ |
| `ping`             | `ping`             | -                                     | `String`         | Returns `"Litetify core v{version} ready"` |
| `scan_mods`        | `scan_mods`        | -                                     | `Vec<ModEntry>`  | Scans `mods/` directory for mod manifests  |
| `read_mod_file`    | `read_mod_file`    | `mod_path: String, file_path: String` | `Result<String>` | Sandboxed file read within mod directory   |
| `get_mods_path`    | `get_mods_path`    | -                                     | `String`         | Current mods directory path                |
| `open_mods_folder` | `open_mods_folder` | -                                     | `Result<()>`     | Open mods folder in file explorer          |
| `open_path`        | `open_path`        | `path: String`                        | `Result<()>`     | Open arbitrary path in file explorer       |

Note: `get_config`, `set_config`, and `reset_config` are defined in
`src-tauri/src/config.rs` but are not registered in `generate_handler!`
in v1.0.0, so they are not invocable until registered.

### Authentication

| Command                      | Rust Path                          | Args                           | Returns          | Notes                     |
| ---------------------------- | ---------------------------------- | ------------------------------ | ---------------- | ------------------------- |
| `login`                      | `auth::login`                      | `client_id, enabled_features?` | `Result<String>` | PKCE flow; opens browser  |
| `logout`                     | `auth::logout`                     | -                              | `Result<()>`     | Clears keyring            |
| `check_auth`                 | `auth::check_auth`                 | -                              | `bool`           | Keyring has tokens        |
| `get_valid_token`            | `auth::get_valid_token`            | `client_id`                    | `Result<String>` | Auto-refreshes if expired |
| `get_profile`                | `auth::get_profile`                | `client_id`                    | `Result<Value>`  | Fetches `/v1/me`          |
| `check_reauth_needed`        | `auth::check_reauth_needed`        | `enabled_features`             | `Vec<String>`    | Missing scopes            |
| `get_granted_scopes_command` | `auth::get_granted_scopes_command` | -                              | `Vec<String>`    | Historically granted      |

### User Profile

| Command                   | Rust Path                               | Args                           | Returns              | Notes                                                  |
| ------------------------- | --------------------------------------- | ------------------------------ | -------------------- | ------------------------------------------------------ |
| `api_get_me`              | `api::profile::api_get_me`              | -                              | `SpotifyUserProfile` | Current user                                           |
| `api_get_top_artists`     | `api::profile::api_get_top_artists`     | `limit?, offset?, time_range?` | `TopArtists`         | `time_range`: `short_term`, `medium_term`, `long_term` |
| `api_get_top_tracks`      | `api::profile::api_get_top_tracks`      | `limit?, offset?, time_range?` | `TopTracks`          | Same time_range options                                |
| `api_get_recently_played` | `api::profile::api_get_recently_played` | `limit?`                       | `RecentlyPlayed`     | Recently played tracks                                 |

### Playlists

| Command                    | Rust Path                                  | Args                                        | Returns            | Notes                        |
| -------------------------- | ------------------------------------------ | ------------------------------------------- | ------------------ | ---------------------------- |
| `api_get_playlists`        | `api::playlists::api_get_playlists`        | `limit?, offset?`                           | `SpotifyPlaylists` | Current user's playlists     |
| `api_get_playlist`         | `api::playlists::api_get_playlist`         | `playlist_id, fields?`                      | `PlaylistDetail`   | Fields for partial response  |
| `api_get_playlist_tracks`  | `api::playlists::api_get_playlist_tracks`  | `playlist_id, limit?, offset?`              | `PlaylistTracks`   | Paginated tracks             |
| `api_create_playlist`      | `api::playlists::api_create_playlist`      | `name, description?, public?`               | `()`               | Creates new playlist         |
| `api_update_playlist`      | `api::playlists::api_update_playlist`      | `playlist_id, name?, description?, public?` | `()`               | Updates metadata             |
| `api_add_to_playlist`      | `api::playlists::api_add_to_playlist`      | `playlist_id, uris`                         | `() `              | Add tracks by URI            |
| `api_remove_from_playlist` | `api::playlists::api_remove_from_playlist` | `playlist_id, uris`                         | `()`               | Remove tracks by URI         |
| `api_follow_playlist`      | `api::playlists::api_follow_playlist`      | `playlist_id`                               | `()`               | Follow (save) a playlist     |
| `api_unfollow_playlist`    | `api::playlists::api_unfollow_playlist`    | `playlist_id`                               | `()`               | Unfollow (remove) a playlist |

### Library

| Command                   | Rust Path                               | Args              | Returns       | Notes                      |
| ------------------------- | --------------------------------------- | ----------------- | ------------- | -------------------------- |
| `api_get_liked_tracks`    | `api::library::api_get_liked_tracks`    | `limit?, offset?` | `LikedTracks` | Saved tracks               |
| `api_save_to_library`     | `api::library::api_save_to_library`     | `uris`            | `()`          | Save tracks to library     |
| `api_remove_from_library` | `api::library::api_remove_from_library` | `uris`            | `()`          | Remove tracks from library |
| `api_check_library`       | `api::library::api_check_library`       | `uris`            | `Vec<bool>`   | Check if tracks are saved  |

### Albums

| Command         | Rust Path                    | Args       | Returns        | Notes                  |
| --------------- | ---------------------------- | ---------- | -------------- | ---------------------- |
| `api_get_album` | `api::albums::api_get_album` | `album_id` | `SpotifyAlbum` | Full album with tracks |

### Artists

| Command                     | Rust Path                                 | Args                         | Returns                | Notes                 |
| --------------------------- | ----------------------------------------- | ---------------------------- | ---------------------- | --------------------- |
| `api_get_artist`            | `api::artists::api_get_artist`            | `artist_id`                  | `SpotifyArtist`        | Artist profile        |
| `api_get_artist_top_tracks` | `api::artists::api_get_artist_top_tracks` | `artist_id, market?`         | `ArtistTopTracks`      | Top 10 tracks         |
| `api_get_artist_albums`     | `api::artists::api_get_artist_albums`     | `artist_id, limit?, offset?` | `ArtistAlbums`         | Paginated discography |
| `api_get_related_artists`   | `api::artists::api_get_related_artists`   | `artist_id`                  | `ArtistRelatedArtists` | Related artists       |
| `api_check_follow_artist`   | `api::artists::api_check_follow_artist`   | `artist_id`                  | `bool`                 | Is following?         |
| `api_follow_artist`         | `api::artists::api_follow_artist`         | `artist_id`                  | `()`                   | Follow artist         |
| `api_unfollow_artist`       | `api::artists::api_unfollow_artist`       | `artist_id`                  | `()`                   | Unfollow artist       |

### Search & Recommendations

| Command                   | Rust Path                              | Args                                                | Returns           | Notes                                                     |
| ------------------------- | -------------------------------------- | --------------------------------------------------- | ----------------- | --------------------------------------------------------- |
| `api_search`              | `api::search::api_search`              | `query, types, limit?, offset?, market?`            | `SearchResult`    | `types` is comma-separated: `track,artist,album,playlist` |
| `api_get_recommendations` | `api::search::api_get_recommendations` | `seed_artists?, seed_tracks?, seed_genres?, limit?` | `Recommendations` | Up to 5 seed values total                                 |

### Player (Spotify API proxy)

| Command                     | Rust Path                                | Args                                                | Returns           | Notes                           |
| --------------------------- | ---------------------------------------- | --------------------------------------------------- | ----------------- | ------------------------------- |
| `api_get_currently_playing` | `api::player::api_get_currently_playing` | -                                                   | `CurrentlyPlaying | null`                           | Current playback state; null if nothing playing |
| `api_play`                  | `api::player::api_play`                  | `device_id, uri?, context_uri?, uris?, offset_uri?` | `()`              | Resume or play specific content |
| `api_pause`                 | `api::player::api_pause`                 | `device_id`                                         | `()`              | Pause playback                  |
| `api_next`                  | `api::player::api_next`                  | `device_id`                                         | `()`              | Skip to next                    |
| `api_previous`              | `api::player::api_previous`              | `device_id`                                         | `()`              | Skip to previous                |
| `api_set_shuffle`           | `api::player::api_set_shuffle`           | `state, device_id`                                  | `()`              | Toggle shuffle                  |
| `api_set_repeat`            | `api::player::api_set_repeat`            | `state, device_id`                                  | `()`              | `off`, `context`, or `track`    |
| `api_add_to_queue`          | `api::player::api_add_to_queue`          | `uri, device_id?`                                   | `()`              | Add track to playback queue     |

### Devices

| Command                     | Rust Path                                 | Args                | Returns       | Notes                       |
| --------------------------- | ----------------------------------------- | ------------------- | ------------- | --------------------------- |
| `api_get_available_devices` | `api::devices::api_get_available_devices` | -                   | `Vec<Device>` | All Spotify Connect devices |
| `api_transfer_playback`     | `api::devices::api_transfer_playback`     | `device_ids, play?` | `()`          | Transfer to device(s)       |

### Shows & Podcasts

| Command                 | Rust Path                           | Args                       | Returns            | Notes                    |
| ----------------------- | ----------------------------------- | -------------------------- | ------------------ | ------------------------ |
| `api_get_saved_shows`   | `api::shows::api_get_saved_shows`   | `limit?, offset?`          | `SpotifyShowPage`  | Saved shows              |
| `api_get_show`          | `api::shows::api_get_show`          | `show_id`                  | `SpotifyShow`      | Show details             |
| `api_get_show_episodes` | `api::shows::api_get_show_episodes` | `show_id, limit?, offset?` | `ShowEpisodesPage` | Paginated episodes       |
| `api_save_show`         | `api::shows::api_save_show`         | `show_id`                  | `()`               | Save show to library     |
| `api_remove_show`       | `api::shows::api_remove_show`       | `show_id`                  | `()`               | Remove show from library |

### Playback Engine (WebSDK - local event dispatch)

| Command                 | Rust Path                                 | Args                                     | Returns          | Notes                               |
| ----------------------- | ----------------------------------------- | ---------------------------------------- | ---------------- | ----------------------------------- |
| `set_active_device`     | `playback::websdk::set_active_device`     | `device_id`                              | `()`             | Store active device ID in Mutex     |
| `get_active_device`     | `playback::websdk::get_active_device`     | -                                        | `Option<String>` | Currently stored device ID          |
| `engine_play`           | `playback::websdk::engine_play`           | `uri?, context_uri?, uris?, offset_uri?` | `Result<()>`     | Emits `engine:play` event           |
| `engine_pause`          | `playback::websdk::engine_pause`          | -                                        | `Result<()>`     | Emits `engine:pause` event          |
| `engine_resume`         | `playback::websdk::engine_resume`         | -                                        | `Result<()>`     | Emits `engine:resume` event         |
| `engine_seek`           | `playback::websdk::engine_seek`           | `position_ms`                            | `Result<()>`     | Emits `engine:seek` event           |
| `engine_set_volume`     | `playback::websdk::engine_set_volume`     | `volume`                                 | `Result<()>`     | Emits `engine:set-volume` event     |
| `engine_next`           | `playback::websdk::engine_next`           | -                                        | `Result<()>`     | Emits `engine:next` event           |
| `engine_previous`       | `playback::websdk::engine_previous`       | -                                        | `Result<()>`     | Emits `engine:previous` event       |
| `engine_toggle_shuffle` | `playback::websdk::engine_toggle_shuffle` | -                                        | `Result<()>`     | Emits `engine:toggle-shuffle` event |
| `engine_cycle_repeat`   | `playback::websdk::engine_cycle_repeat`   | -                                        | `Result<()>`     | Emits `engine:cycle-repeat` event   |

**Engine events**: WebSDK commands are dispatched as Tauri events (`app.emit("engine:*", payload)`). The frontend's WebSDK player listens for these events and executes the corresponding Spotify Web Playback SDK actions.

---

## 4. Rate Limiting and Retry Behavior

### Retry Strategy (`api::req::call_api`)

The shared HTTP client in `src-tauri/src/api/req.rs` implements a multi-strategy retry loop:

```rust
const MAX_RETRIES: u32 = 3;
const BASE_BACKOFF_MS: u64 = 500;
```

| Scenario                               | Retry Behavior                             | Backoff                                                                |
| -------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| **Network failure** (connection error) | Retry up to 3 times                        | Exponential: `BASE_BACKOFF_MS * 2^(retry-1)` (500ms, 1s, 2s)           |
| **HTTP 429 (Too Many Requests)**       | Retry up to 3 times                        | Uses `Retry-After` header value (seconds); if absent, falls back to 1s |
| **HTTP 401 (Unauthorized)**            | Retry **exactly once** after token refresh | 100ms delay before retry                                               |
| **HTTP 5xx (Server Error)**            | Retry up to 3 times                        | Exponential backoff: `BASE_BACKOFF_MS * 2^(retry-1)`                   |
| **HTTP 4xx (other)**                   | **No retry**                               | Returns error immediately                                              |
| **204 No Content / Empty body**        | No retry                                   | Parsed as JSON `null`                                                  |

The retry loop will not retry a 401 twice - if the token was already refreshed and the second attempt also returns 401, the error is propagated (likely an expired or revoked refresh token requiring re-auth).

### Frontend Retry (React Query)

The `queryClient` in `src/lib/queries/queryClient.ts` configures:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // Retry failed queries twice (on top of Rust retries)
      staleTime: 30_000, // 30s default stale time
      refetchOnWindowFocus: false,
    },
  },
});
```

Individual query hooks may override these defaults:

| Hook                                                                         | Retry | Stale Time | Refetch Interval |
| ---------------------------------------------------------------------------- | ----- | ---------- | ---------------- |
| `useMe`                                                                      | 2     | 5 min      | -                |
| `usePlaylists` / `usePlaylist`                                               | 2     | 1 min      | -                |
| `usePlaylistTracks` (infinite)                                               | 2     | 30s        | -                |
| `useLikedTracks`                                                             | 2     | 30s        | -                |
| `useArtist` / `useArtistTopTracks` / `useArtistAlbums` / `useRelatedArtists` | 2     | 5 min      | -                |
| `useAlbum`                                                                   | 2     | 5 min      | -                |
| `useCurrentlyPlaying`                                                        | 1     | 0          | 5s               |
| `useAvailableDevices`                                                        | 1     | 0          | 10s              |
| `useSearch`                                                                  | 1     | 1 min      | -                |
| `useTopArtists` / `useTopTracks`                                             | 1     | 5 min      | -                |
| `useRecentlyPlayed`                                                          | 1     | 1 min      | -                |
| `useHomePlaylists`                                                           | 1     | 1 min      | -                |
| `useSavedShows` / `useShow` / `useShowEpisodes`                              | 2     | 1-5 min    | -                |
| `useTrackSaved`                                                              | -     | 30s        | -                |

### HTTP Client Configuration

- **Timeout**: 30 seconds per request (`reqwest::Client::builder().timeout(Duration::from_secs(30))`)
- **Content-Length header**: Player control endpoints (play, pause, skip, etc.) send an explicit `Content-Length: 0` header with an empty body to satisfy Spotify's 411 Length Required policy.

---

## 5. Type System

### Typeshare Integration

Litetify uses `typeshare` (v1.0.5) to generate TypeScript types from Rust struct definitions. This ensures the frontend types are always in sync with the Rust backend.

**Source of truth**: Rust structs annotated with `#[typeshare]` in `src-tauri/src/api/req.rs` and other modules.

**Generated output**: `src/lib/types.generated.ts` (generated by `typeshare` CLI at build time).

**Re-export**: `src/lib/types.ts` re-exports all generated types from `types.generated.ts` and adds a single hand-maintained type (`SearchType`).

### Type Mappings

| Rust Type              | TypeScript Interface   | Source File       |
| ---------------------- | ---------------------- | ----------------- |
| `SpotifyUserProfile`   | `SpotifyUserProfile`   | `req.rs`          |
| `SpotifyImage`         | `SpotifyImage`         | `req.rs`          |
| `Followers`            | `Followers`            | `req.rs`          |
| `SpotifyPlaylist`      | `SpotifyPlaylist`      | `req.rs`          |
| `SpotifyPlaylists`     | `SpotifyPlaylists`     | `req.rs`          |
| `PlaylistDetail`       | `PlaylistDetail`       | `req.rs`          |
| `PlaylistDetailTracks` | `PlaylistDetailTracks` | `req.rs`          |
| `PlaylistTracks`       | `PlaylistTracks`       | `req.rs`          |
| `PlaylistTracksRef`    | `PlaylistTracksRef`    | `req.rs`          |
| `PlaylistTrackItem`    | `PlaylistTrackItem`    | `req.rs`          |
| `SpotifyTrack`         | `SpotifyTrack`         | `req.rs`          |
| `SpotifyArtistBrief`   | `SpotifyArtistBrief`   | `req.rs`          |
| `SpotifyAlbumBrief`    | `SpotifyAlbumBrief`    | `req.rs`          |
| `SpotifyAlbum`         | `SpotifyAlbum`         | `req.rs`          |
| `AlbumTracks`          | `AlbumTracks`          | `req.rs`          |
| `SpotifyArtist`        | `SpotifyArtist`        | `req.rs`          |
| `ArtistAlbums`         | `ArtistAlbums`         | `req.rs`          |
| `ArtistTopTracks`      | `ArtistTopTracks`      | `req.rs`          |
| `ArtistRelatedArtists` | `ArtistRelatedArtists` | `req.rs`          |
| `LikedTracks`          | `LikedTracks`          | `req.rs`          |
| `LikedTrackItem`       | `LikedTrackItem`       | `req.rs`          |
| `SearchResult`         | `SearchResult`         | `req.rs`          |
| `SearchTracks`         | `SearchTracks`         | `req.rs`          |
| `SearchArtists`        | `SearchArtists`        | `req.rs`          |
| `SearchAlbums`         | `SearchAlbums`         | `req.rs`          |
| `SearchPlaylists`      | `SearchPlaylists`      | `req.rs`          |
| `Recommendations`      | `Recommendations`      | `req.rs`          |
| `SpotifyTrackWrapper`  | `SpotifyTrackWrapper`  | `req.rs`          |
| `Device`               | `Device`               | `req.rs`          |
| `CurrentlyPlaying`     | `CurrentlyPlaying`     | `req.rs`          |
| `TopArtists`           | `TopArtists`           | `req.rs`          |
| `TopTracks`            | `TopTracks`            | `req.rs`          |
| `PlayHistory`          | `PlayHistory`          | `req.rs`          |
| `RecentlyPlayed`       | `RecentlyPlayed`       | `req.rs`          |
| `SpotifyOwner`         | `SpotifyOwner`         | `req.rs`          |
| `SpotifyShowPage`      | `SpotifyShowPage`      | `req.rs`          |
| `SpotifyShow`          | `SpotifyShow`          | `req.rs`          |
| `ShowEpisode`          | `ShowEpisode`          | `req.rs`          |
| `ShowEpisodesPage`     | `ShowEpisodesPage`     | `req.rs`          |
| `RepeatMode`           | `enum RepeatMode`      | `playback/mod.rs` |
| `PlaybackState`        | `PlaybackState`        | `playback/mod.rs` |
| `ModManifest`          | `ModManifest`          | `mods/mod.rs`     |
| `ModType`              | `enum ModType`         | `mods/mod.rs`     |
| `ModEntry`             | `ModEntry`             | `mods/mod.rs`     |

### Serde Decorations

Several Rust types use custom deserialization helpers defined in `req.rs`:

- `#[serde(default, deserialize_with = "deserialize_null_to_default")]` - Converts JSON `null` to the type's default (empty string, 0, etc.) instead of failing. Used on non-optional fields where Spotify sometimes returns null.
- `#[serde(default, deserialize_with = "deserialize_vec_skip_nulls")]` - Skips `null` entries inside `items` arrays (Spotify's search results sometimes include null items for unavailable content).
- `#[serde(alias = "...")]` - Accepts both old and new field names during Spotify API migrations (e.g., `track` ↔ `item`, `tracks` ↔ `items`).
- `#[serde(rename = "type")]` + `pub type_: String` - `type` is a reserved keyword in Rust; the struct field is `type_` but serialized/deserialized as `type`.

### Hand-Maintained Types

```typescript
// src/lib/types.ts - single non-generated type
export type SearchType = 'track' | 'artist' | 'album' | 'playlist';
```

---

## 6. Error Handling

### Rust Backend

All Tauri commands return `Result<T, String>`. Errors flow as:

1. **Network errors** - `reqwest` failures (timeout, DNS, connection refused) are caught, retried thrice, then returned as `format!("request failed after {MAX_RETRIES} retries: {e}")`.
2. **API errors** - Non-2xx HTTP status codes are logged via `eprintln!` and returned as `format!("{}: {body}", status.as_u16())`.
3. **Auth errors** - Token refresh failures surface as `format!("refresh failed ({status}): {body}")`. 401 after refresh returns `"unauthorized after refresh: {body_text}"`.
4. **Rate limit errors** - 429 after exhausting retries returns `format!("rate limited after {MAX_RETRIES} retries: {body}")`.
5. **Parse errors** - JSON deserialization failures log the truncated body and return `format!("parse error: {e}")`.
6. **Business validation** - Non-Premium accounts are rejected with an explicit error: `"Spotify Premium required..."`.

### Frontend Bridge (`src/lib/api.ts`)

The `req<T>()` helper wraps `invoke()` and converts Tauri error strings into proper `Error` objects:

```typescript
async function req<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, { ...args, clientId: id });
  } catch (e) {
    throw e instanceof Error
      ? e
      : new Error(typeof e === 'string' ? e : JSON.stringify(e));
  }
}
```

This ensures that React Query error boundaries can always access `error.message`.

### React Query Error Handling

Queries that fail are automatically retried (2 retries default, 1 for polled queries). Mutations can use `onError` callbacks for user-facing error displays. Cache invalidation triggers refetches that may encounter errors which propagate through the same mechanism.

---

## 7. Security Model

### Token Isolation

- **Tokens never leave the Rust process**. Access tokens and refresh tokens are stored exclusively in the OS keyring (`keyring` crate) and accessed only by Rust code.
- The frontend **never has direct access to tokens**. It receives a valid access token only when explicitly requesting it via `get_valid_token` (used for WebSDK player initialization), but the token never persists in JavaScript memory.
- Token refresh is entirely transparent - the frontend cannot distinguish a cached response from a refreshed one.

### Client ID Handling

- The Spotify Developer Client ID is stored in app config (`config.json` managed by `tauri-plugin-store` on disk) and passed as a parameter to each IPC call.
- No client secret is used (PKCE flow is secret-less by design).

### Callback Server Security

- The OAuth callback server listens only on `127.0.0.1` (localhost), never on `0.0.0.0`.
- CSRF protection via the `state` parameter: the callback is rejected (HTTP 403) if the returned state doesn't match.
- Automatic port fallback with a maximum of 10 retries in case the default port is occupied.
- The server handles exactly one incoming request, then shuts down.

### Scope Management

- Minimum-required scopes are requested based on enabled features.
- Scopes are accumulated across re-authentications - previously granted scopes are preserved in the keyring.
- The `check_reauth_needed` command allows the UI to detect when new features require additional scopes.

### File System Access (Mod System)

The `read_mod_file` command enforces path confinement:

1. The mod path must start with the base `mods/` directory path.
2. The resolved file path is checked against the mod directory to prevent `../` traversal.
3. An environment variable override (`LITETIFY_MODS_DIR`) exists but only if the directory already exists.

### Capabilities (Tauri v2)

The Tauri capabilities file (`src-tauri/capabilities/default.json`) scopes permissions:

```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    "core:webview:allow-create-webview-window",
    "core:window:allow-close",
    "core:window:allow-set-focus",
    "core:window:allow-center"
  ]
}
```

A separate `mini-player` window capability has reduced permissions (`core:default`, `core:window:allow-close`).

### Plugin Permissions

- `tauri-plugin-opener` - Used only for opening the Spotify auth URL and mods folder. The URL is a hardcoded `https://accounts.spotify.com/authorize` endpoint with query parameters built in Rust.
- `tauri-plugin-updater` - For app updates, scoped to the application's update server.
- `tauri-plugin-store` - Persistent config storage on disk (not in localStorage).

---

## Appendix: Frontend Query Hook Structure

Each domain in `src/lib/queries/` follows a consistent pattern:

| File                   | Hook(s)                                                                                                              | Key Structure                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `useMe.ts`             | `useMe`                                                                                                              | `['me']`                                          |
| `usePlaylists.ts`      | `usePlaylists`                                                                                                       | `['playlists', 'list', limit, offset]`            |
| `usePlaylist.ts`       | `usePlaylist`                                                                                                        | `['playlists', id, fields]`                       |
| `usePlaylistTracks.ts` | `usePlaylistTracks` (infinite query)                                                                                 | `['playlists', id, 'tracks', 'all']`              |
| `useAlbum.ts`          | `useAlbum`                                                                                                           | `['album', id]`                                   |
| `useArtist.ts`         | `useArtist`, `useArtistTopTracks`, `useArtistAlbums`, `useRelatedArtists`, `useIsFollowingArtist`, `useFollowArtist` | `['artist', id, ...]`                             |
| `useSearch.ts`         | `useSearch`                                                                                                          | `['search', query, types, limit, offset, market]` |
| `useLikedTracks.ts`    | `useLikedTracks`                                                                                                     | `['liked', limit, offset]`                        |
| `usePlayer.ts`         | `useCurrentlyPlaying`, `useAvailableDevices`, `useTransferPlayback`                                                  | `['player', ...]`                                 |
| `useHome.ts`           | `useTopArtists`, `useTopTracks`, `useRecentlyPlayed`, `useHomePlaylists`                                             | `['home', ...]`                                   |
| `useBrowse.ts`         | `useBrowseDiscover`, `useBrowseGenreSections`                                                                        | `['browse', ...]`                                 |
| `useShows.ts`          | `useSavedShows`, `useShow`, `useShowEpisodes`                                                                        | `['shows', ...]`                                  |
| `useTrackSaved.ts`     | `useTrackSaved` (query + mutation combo)                                                                             | `['library', 'check', uri]`                       |

Key design principles:

- Query keys follow a structured hierarchy for targeted cache invalidation.
- Mutations invalidate related queries on success.
- Polled queries (`useCurrentlyPlaying` at 5s, `useAvailableDevices` at 10s) have lower retry counts (1 instead of 2).
- Queries with IDs as dependencies use `enabled: !!id` to skip execution when the ID is empty.
