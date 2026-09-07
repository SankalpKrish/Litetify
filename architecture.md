# Litetify Architecture

Litetify is a **Tauri v2** desktop client for Spotify with a **React 19 + TypeScript** frontend (`src/`) and a **Rust** backend (`src-tauri/`). The application compiles to a native executable - the Rust core builds as a library (`litetify_lib`) loaded by the Tauri executable.

---

## Layer Overview

```
+-------------------------------------------------------------------+
|                   Webview / Renderer Process                       |
|  React 19 / TypeScript / Vite                                      |
|  +------------+ +------------+ +------------------------------+    |
|  | UI (views) | | Mod API    | | Web Playback SDK             |    |
|  | (features) | | (sandbox)  | | (websdk engine)              |    |
|  +------------+ +------------+ +------------------------------+    |
|       |              |                       |                     |
|  +----+--------------+-----------------------+----+                |
|  |          @tauri-apps/api (IPC bridge)          |                |
|  +--------------------+---------------------------+                |
+-----------------------+-------------------------------------------+
|                Tauri IPC (serialized JSON-RPC)                     |
+-----------------------+-------------------------------------------+
|                    Rust Core (privileged process)                   |
|  +----------+ +-----------+ +------------+ +----------+            |
|  | Auth     | | API Proxy | | Playback   | | Mods     |            |
|  | (PKCE)   | | (Spotify) | | (engine)   | | (loader) |            |
|  +----------+ +-----------+ +------------+ +----------+            |
|       |                        |                                   |
|  +----+----------+        +----+----------+                        |
|  | OS Keychain   |        | librespot     |                        |
|  | (keyring)     |        | (optional)    |                        |
|  +---------------+        +---------------+                        |
+-------------------------------------------------------------------+
```

---

## Rust Core (`src-tauri/`)

The Rust side owns everything sensitive or native. It compiles to a library (`litetify_lib`) loaded by the Tauri executable. Entry point is `main.rs`, which calls `litetify_lib::run()`.

### Modules

| Module      | Responsibility                                                                                                                                  | Key Files                                                                                                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api/`      | Spotify Web API proxy - modular per-resource with shared retry/backoff logic                                                                    | `mod.rs` (facade + re-exports), `req.rs` (shared types, headers, `call_api` with retry), `playlists.rs`, `library.rs`, `search.rs`, `artists.rs`, `albums.rs`, `player.rs`, `devices.rs`, `profile.rs`, `shows.rs` |
| `auth/`     | PKCE flow - code verifier/challenge generation, loopback callback server, OS keychain token storage, auto-refresh                               | `mod.rs` (orchestrator, `login`/`logout`/`check_auth` Tauri commands), `pkce.rs` (SHA-256 code challenge, state generation), `server.rs` (tiny_http callback server), `tokens.rs` (keyring store/load/refresh)     |
| `playback/` | `PlaybackEngine` trait with WebSDK implementation; shared `PlaybackState` and `RepeatMode` types                                                  | `mod.rs` (trait + types), `websdk.rs` (Tauri event emitter bridge)                                                                                             |
| `mods/`     | Filesystem scanning of `mods/` directories, `manifest.json` parsing with validation, path-traversal-safe file reads                             | `mod.rs` (scan, read_mod_file, path resolution)                                                                                                                                                                    |
| `config.rs` | Persistent user-configurable settings via `tauri-plugin-store` - `LitetifyConfig` struct with `get_config`/`set_config`/`reset_config` commands | `config.rs`                                                                                                                                                                                                        |

### IPC Handlers

Exposed via `#[tauri::command]` and registered in `lib.rs` (60+ commands):

- **Auth (7):** `login`, `logout`, `check_auth`, `get_valid_token`, `get_profile`, `check_reauth_needed`, `get_granted_scopes_command`
- **API proxy (30+):** `api_get_me`, `api_get_playlists`, `api_create_playlist`, `api_update_playlist`, `api_get_playlist`, `api_get_playlist_tracks`, `api_get_liked_tracks`, `api_get_album`, `api_get_artist`, `api_get_artist_top_tracks`, `api_get_artist_albums`, `api_get_related_artists`, `api_search`, `api_get_recommendations`, `api_get_currently_playing`, `api_transfer_playback`, `api_get_available_devices`, `api_play`, `api_pause`, `api_next`, `api_previous`, `api_set_shuffle`, `api_set_repeat`, `api_add_to_queue`, `api_save_to_library`, `api_remove_from_library`, `api_check_library`, `api_add_to_playlist`, `api_remove_from_playlist`, `api_follow_playlist`, `api_unfollow_playlist`, `api_check_follow_artist`, `api_follow_artist`, `api_unfollow_artist`, `api_get_top_artists`, `api_get_top_tracks`, `api_get_recently_played`, `api_get_saved_shows`, `api_get_show`, `api_get_show_episodes`, `api_save_show`, `api_remove_show`
- **Playback (websdk - 11):** `set_active_device`, `get_active_device`, `engine_play`, `engine_pause`, `engine_resume`, `engine_seek`, `engine_set_volume`, `engine_next`, `engine_previous`, `engine_toggle_shuffle`, `engine_cycle_repeat`
- **Config (3, defined but not registered in v1.0.0):** `get_config`, `set_config`, `reset_config`
- **System/Mods (6):** `ping`, `scan_mods`, `read_mod_file`, `get_mods_path`, `open_mods_folder`, `open_path`

### Security Model

- **No client secret** - public desktop app uses PKCE; no backend server involved
- **Tokens stored in OS keychain** via the `keyring` crate (service `com.litetify.app`, user `spotify`); never written to disk as plaintext
- **API calls proxied through Rust** - the access token never leaves the Rust process except when passed to the Web Playback SDK (accepted design constraint)
- **Tauri capabilities** scoped per window in `capabilities/default.json` - `core:default`, `opener:default`, limited window management permissions for the main window; separate `mini-player` capability set for the detached mini-player window
- **Rate limiting** - `MAX_RETRIES = 3`, `BASE_BACKOFF_MS = 500` with exponential backoff; 401 triggers one automatic token-refresh retry; 429 respects `Retry-After` header; 5xx retries with exponential backoff
- **Mod security** - sandboxed iframes with `allow-scripts` only; `read_mod_file` validates that the resolved path does not escape the mod directory (path-traversal guard)

### Type Unification

Rust structs are annotated with `#[typeshare]` and TypeScript types are generated via `typeshare` version `1.0.5` to `src/lib/types.generated.ts` (349 lines). A CI gate (`bun run types:check`) ensures generated types stay in sync with Rust definitions. Types covered include all Spotify API response models and internal structs like `PlaybackState`, `RepeatMode`, `ModManifest`, `ModEntry`.

---

## Renderer (`src/`)

The webview side handles UI rendering, state management, and the mod sandbox.

### Key Directories

| Directory                   | Purpose                                                                                                                                                                                                                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/auth/`        | Login screen (`LoginScreen.tsx`), auth state management (`authStore.ts`) with Rust-backed PKCE login                                                                                                                                                                                                                  |
| `src/features/player/`      | NowPlayingBar, TransportControls, VolumeControl, ProgressBar, NowPlayingInfo, NowPlayingView, MiniPlayer, MiniPlayerView, MiniplayerHost, DeviceSelector, OfflineBanner, SleepTimer, PlaybackTimerBadge, AutoQueueToggle, PlayerInitializer, playerStore (Zustand), `crossfade`, `autoQueue`, `playbackTimer`, `useMediaSession`, `useAutoQueue`, `usePlaybackTimer`                                                     |
| `src/features/library/`     | PlaylistDetail, AlbumView, ArtistView, LibraryView, LikedSongs, PlaylistList, PodcastList, TrackRow, TrackArt, ViewAsMenu, CreatePlaylistDialog, viewModeStore                                                                                                                                                                     |
| `src/features/search/`      | SearchView with tabbed results (tracks, artists, albums, playlists)                                                                                                                                                                                                                                                   |
| `src/features/browse/`      | HomeView (personalized feed with new releases, featured playlists), BrowseView                                                                                                                                                                                                                                        |
| `src/features/settings/`    | SettingsView, Mods management, Playback config, EqualizerSettings, Permissions                                                                                                                                                                                                                           |
| `src/features/contextmenu/` | ContextMenu with track actions (play next, add to queue, save to library, share)                                                                                                                                                                                                                                      |
| `src/features/pins/`        | Pinned sidebar items (Zustand store, reorder helpers)                                                                                                                                                                                                                                                                                  |
| `src/features/stats/`       | StatsView - top artists, top tracks, recently played                                                                                                                                                                                                                                                                  |
| `src/features/podcasts/`    | PodcastView - shows and episodes                                                                                                                                                                                                                                                                                      |
| `src/playback/`             | Playback engine TS interface (`engine.ts`), Web SDK adapter (`websdk.ts`, 478 lines), MiniPlayer events (`miniplayerEvents.ts`)                                                                                                                                                   |
| `src/mods/`                 | Mod loader (`loader.ts`), sandbox (`sandbox.ts` with iframe postMessage bridge), API surface (`api.ts` with `window.Litetify`), themes (`themes.ts` CSS injection), custom apps (`apps.tsx` sidebar tabs), store (`store.ts`), manifest validation (`manifest.ts` with Zod schemas), permissions (`permissions.ts`), UI components (`components.tsx`), barrel export (`index.ts`) |
| `src/lib/`                  | API client (`api.ts` - typed Tauri invoke wrappers), config client (`config.ts` with sync cache), debug logger (`debug.ts`), generated types (`types.generated.ts`), ErrorBoundary (`ErrorBoundary.tsx`), offline state (`offline.ts`), formatting helpers (`utils.ts`), view routing (`ViewState.tsx`), React Query hooks (`queries/`)                                              |
| `src/lib/queries/`          | React Query hooks: `useMe`, `usePlaylists`, `usePlaylist`, `usePlaylistTracks`, `useLikedTracks`, `useAlbum`, `useArtist`, `useSearch`, `useHome`, `useBrowse`, `usePlayer`, `useShows`, `useTrackSaved` + `queryClient.ts`                                                                                                        |
| `src/styles/`               | Design tokens (`tokens.css` with comprehensive CSS custom properties), global styles (`global.css`), component-scoped CSS Modules (`*.module.css`)                                                                                                                                                                    |
| `src/app/`                  | Layout shell: `Sidebar.tsx`, `PinnedList.tsx`, styles (`Sidebar.module.css`); root component lives at `src/App.tsx` (routing, auth guard, QueryClientProvider, PlayerInitializer)                                                                                                                                                                                              |

### Styling

CSS is organized as component-scoped **CSS Modules** (25+ `*.module.css` files) with shared design tokens in `tokens.css`. The monolithic `global.css` has been reduced to resets, layout grid, shared component classes, and animation keyframes. Design tokens are defined as CSS custom properties on `:root` covering backgrounds (`--lt-bg-*`, 7 tokens), foregrounds (`--lt-fg-*`, 3 tokens), accent colors (`--lt-accent-*`, 3 tokens), borders, error states, layout dimensions, font families, font sizes (8 steps), font weights (4 steps), line heights (3 steps), spacing (7 steps), border radii (4 steps), box shadows (3 steps), transitions, and z-index layers. Typography uses Inter as the primary font family with system fallbacks.

### Data Flow

1. UI component calls a typed function in `src/lib/api.ts` or a React Query hook in `src/lib/queries/`
2. The API function invokes the corresponding Tauri command via `invoke()` from `@tauri-apps/api/core`
3. Tauri serializes the arguments as JSON-RPC and routes them to the registered Rust `#[tauri::command]` handler
4. Rust authenticates (auto-refreshes token if expired), calls the Spotify Web API, applies retry/backoff, and deserializes the response
5. The renderer receives strongly-typed data through the `invoke()` return value, managed by React Query caching (`queryClient` with 30s stale time, 2 retries)

---

## Auth Flow

Litetify uses the **Authorization Code with PKCE** (Proof Key for Code Exchange) flow with no client secret.

1. Frontend calls `login(clientId, enabledFeatures?)` via Tauri invoke
2. Rust generates a code verifier (32 random bytes, base64url-encoded) and SHA-256 code challenge in `auth/pkce.rs`
3. A local HTTP server (`auth/server.rs` using `tiny_http`) starts on `127.0.0.1:14523` with port fallback across 10 consecutive ports
4. User is directed to Spotify's accounts page via `tauri-plugin-opener`; after consent Spotify redirects to `http://127.0.0.1:<port>/callback` with an auth code and state parameter
5. The callback server validates the state (CSRF protection), extracts the code, and signals completion
6. Rust exchanges the code + verifier for an access token and refresh token at `https://accounts.spotify.com/api/token`
7. Tokens are persisted to the OS keychain (`auth/tokens.rs` via `keyring` crate) as a JSON blob: access token, refresh token, expiry timestamp, and granted scopes
8. Profile is fetched to verify Spotify Premium (non-Premium accounts are rejected)
9. On expiry, the API wrapper in `api/req.rs` automatically refreshes using the stored refresh token (60-second grace window)
10. On refresh failure (expired/revoked refresh token), the user re-authorizes
11. Feature scopes (`user-top-read`, `user-read-recently-played`) are requested only when the corresponding features are enabled at login time; `check_reauth_needed` detects missing scopes for incremental authorization

---

## Playback Engine Architecture

Playback is abstracted behind a common `PlaybackEngine` interface so different backends can be swapped without changing the player UI or state management.

```
playerStore (Zustand)
  +- PlaybackEngine interface (engine.ts)
       +- WebSDKEngine (websdk.ts) - default and only engine in v1.0.0
```

- **`src/playback/engine.ts`** defines the `PlaybackEngine` interface: `play`, `pause`, `resume`, `seek`, `setVolume`, `nextTrack`, `previousTrack`, `toggleShuffle`, `cycleRepeat`, `getState`, `name`. Also defines `PlaybackState` and `PlayContext` types.

- **`src/playback/websdk.ts`** - wraps the Spotify Web Playback SDK (client-side JavaScript SDK loaded at runtime). The Rust side (`playback/websdk.rs`) acts as a relay: it stores an active device ID, exposes `set_active_device`/`get_active_device`, and forwards engine commands via Tauri events (`engine:play`, `engine:pause`, `engine:resume`, `engine:seek`, `engine:set-volume`, `engine:next`, `engine:previous`, `engine:toggle-shuffle`, `engine:cycle-repeat`) which the frontend listens for and forwards to the SDK instance. This is the playback path in v1.0.0.

- **`Rust trait`** - `src-tauri/src/playback/mod.rs` defines `pub trait PlaybackEngine: Send + Sync` with methods mirroring the frontend interface, plus shared `PlaybackState` and `RepeatMode` types annotated with `#[typeshare]`.

- **Engine selection** - persisted in `LitetifyConfig.engineType` (`"websdk"` or `"librespot"`) via the config store. In v1.0.0 only `"websdk"` has a backend implementation; the settings UI retains a librespot toggle, but there is no `src/playback/librespot.ts` adapter and no Rust `playback::librespot` module in this release.

---

## Mod System

Third-party customizations run in sandboxed iframes with a controlled API surface.

- **`src/mods/manifest.ts`** - Zod schema for `manifest.json`: `name`, `version`, `type` (theme, extension, or app), `entry` file path, `description`, `author`, `litetifyApiVersion`, `permissions`, `icon`.
- **`src/mods/loader.ts`** - Calls `scan_mods` Rust command to discover mods from the filesystem, maps raw entries to typed `ModEntry` objects, persists enabled state and active theme to localStorage, and coordinates loading of themes/extensions/apps.
- **`src/mods/sandbox.ts`** - Extensions run in hidden `<iframe sandbox="allow-scripts">` with no Tauri IPC access, no `localStorage`, no arbitrary network hosts. Communication occurs via a `postMessage` bridge: the sandbox sends `{type: "invoke", method, args, _token}` messages, the host dispatches them against a permission-filtered API, and sends back `{type: "result"}` or `{type: "error"}` responses. Each extension gets a unique cryptographic token to prevent cross-extension spoofing.
- **`src/mods/api.ts`** - The `window.Litetify` object exposed to mods: `player` (play, pause, seek, setVolume, getState, onStateChange), `library` (getPlaylists, getLikedTracks, getTopArtists, getTopTracks, getRecentlyPlayed), `ui` (showNotification, showToast, openUrl), `storage` (get, set, remove, clear - scoped localStorage), `events` (on, off, emit via EventEmitter).
- **`src/mods/themes.ts`** - CSS injection layer. Theme CSS is read from the mod's entry file via the Rust `read_mod_file` command, sanitized (URL references stripped), and injected as a `<style>` element into the document head. Only one theme can be active at a time.
- **`src/mods/apps.tsx`** - Custom apps rendered as sidebar tabs. Each app gets a sandboxed iframe displayed as a tab panel, with filtered API permissions based on the mod manifest.
- **`src/mods/store.ts`** - Zustand store for mod state: registry (all discovered mods), enabled set, active theme name.
- **`src/mods/components.tsx`** - Reusable mod UI components (`MountContainer`, `HtmlContainer`).
- **Rust side** - `src-tauri/src/mods/mod.rs` scans the `mods/` directory (discovered via environment variable `LITETIFY_MODS_DIR`, CWD, executable-relative walk, or fallback), parses `manifest.json` for each subdirectory, and exposes `scan_mods`, `read_mod_file`, `get_mods_path`, and `open_mods_folder` commands. File reads include path-traversal protection.

---

## Test Infrastructure

- **Rust unit tests** - `mockito` for HTTP mocking (token refresh, API responses), per-module `#[cfg(test)]` tests covering PKCE vector validation, token serialization/expiry, callback server request handling, retry/backoff logic, and keyring store/load/clear operations (isolated test keyring entries). Tests use `tokio::runtime::Runtime` for async HTTP mocking and `#[tokio::test]` for network error scenarios.
- **Vitest** - 22 test files across `src/__tests__/` (LoginScreen, PinnedList, TransportControls, ProgressBar, VolumeControl, ErrorBoundary, LogoMark, BrandSpinner, boot, modsStore) and `src/lib/queries/__tests__/` (React Query hook tests for all data domains: useMe, usePlaylists, usePlaylist, usePlaylistTracks, useLikedTracks, useAlbum, useArtist, useSearch, useHome, usePlayer, useShows, useTrackSaved) plus store tests (`playerStore`, `pinsStore`, reorder). Test environment is jsdom with `@testing-library/react` and `@testing-library/jest-dom`. Setup file mocks `matchMedia`.
- **CI/CD** - GitHub Actions (`.github/workflows/ci.yml`) with parallel jobs: `lint` (clippy + eslint), `format` (prettier), `typecheck` (tsc --noEmit), `test` (Vitest + cargo test with gnome-keyring for keyring tests), `build` (depends on all previous), `pre-release-gates` (checks for dev-mode remnants, generated type drift), `security-audit` (cargo audit), `code-quality` (knip, cspell, cargo-udeps - all informational/continue-on-error). Release-specific workflow in `release.yml`.

---

## Build Configuration

- **Vite** dev server on port 1420, HMR on port 1421 (when `TAURI_DEV_HOST` is set), strict port mode
- **Code splitting** - `rollupOptions.output.manualChunks` splits into: `vendor` (react, react-dom), `query` (@tanstack/react-query), `player` (NowPlayingBar, TransportControls, ProgressBar, VolumeControl, NowPlayingInfo), `auth` (LoginScreen), `settings` (SettingsView, Mods), `mods` (loader, sandbox, api)
- **Tauri** builds the Rust core from `src-tauri/` and bundles the frontend from `dist/`
- **TypeScript** strict mode with path alias `@/` mapping to `src/`
- **Target** Vite `build.target` is `es2021` for Tauri webview compatibility; TypeScript `target` is `ES2022`; `esbuild` minifier
- **Rust release profile** - `panic = "abort"`, `codegen-units = 1`, `lto = true`, `opt-level = "s"`, `strip = true`
- **Rust minimum version** - 1.77.2
- **Node** minimum version 20, Bun minimum 1.3
- **Linting** - eslint (--max-warnings 0), prettier (format:check), knip (unused code), cspell (spell check)

---

## Tech Stack

| Layer              | Technology                                                         |
| ------------------ | ------------------------------------------------------------------ |
| Desktop shell      | Tauri 2.x (Rust)                                                   |
| Frontend           | TypeScript, React 19                                               |
| Styling            | CSS Modules + design tokens (`tokens.css`) + Global CSS            |
| Bundler            | Vite 6.x                                                           |
| Data fetching      | @tanstack/react-query v5                                           |
| State              | Zustand v5                                                         |
| Auth               | OAuth PKCE (Rust, no client secret, no backend server)             |
| Token storage      | OS keychain (`keyring` crate, service `com.litetify.app`)          |
| Type bridge        | `typeshare` (Rust `#[typeshare]` -> TypeScript)                    |
| Audio (default)    | Spotify Web Playback SDK (client-side JS, relayed via Tauri IPC)   |
| Audio (optional)   | None in v1.0.0 (settings UI retains a librespot toggle, no backend) |
| Extension system   | Sandboxed mod system (iframes + postMessage, permission-filtered)  |
| Config persistence | Tauri store plugin (`tauri-plugin-store`, Rust-managed JSON)       |
| HTTP client        | reqwest 0.12 (Rust)                                                |
| Testing (FE)       | Vitest, @testing-library/react, jsdom                              |
| Testing (Rust)     | mockito, tokio test runtime                                        |
| CI/CD              | GitHub Actions (lint, format, typecheck, test, build, audit)       |
| Keybindings        | Playback settings UI (localStorage-backed auto-queue, crossfade, gapless) |
| Structured logging | Namespaced logger (`src/lib/debug.ts`, togglable via localStorage) |
