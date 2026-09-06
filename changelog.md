# Changelog

All notable changes to Litetify are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] — 2025-07-24

### Added

- Podcat support: Rust API + frontend views + library tab
- Catppuccin theme mods (Latte, Frappé, Macchiato, Mocha)
- Mod system with Spicetify-parity (scan, read, manifest, themes)
- Context menus, sidebar collapse, player polish, view modes
- Auto-queue, playback timer, optional OAuth scopes
- Design tokens, DESIGN.md, PRODUCT.md documentation
- Code quality CI pipeline (knip, cspell, cargo-udeps)
- NowPlayingView, StatsView, offline cache, Sidebar navigation
- Architecture diagram with Spotify palette

### Fixed

- Album art flicker on playback control interaction
- Cross-window state sync for miniplayer, hover animations
- Custom apps blocked by CSP
- Mods folder button, scan path resolution, manifest deserialization
- Progress bar seek, animation, hit area, error logging
- Keyboard shortcut infrastructure removed, focus rings removed
- Miniplayer toggle state reset on close, volume bar centering
- Defer playback display fields to REST API to avoid placeholder/flicker
- Clippy warnings (redundant borrows, too_many_arguments, unused doc comments)
- CI pipeline: add Tauri system deps, fix format/typecheck/eslint

### Changed

- Migrated from npm to Bun
- Rust API modularization, type unification via typeshare
- Config persistence system
- CSS modules migration
- CI/CD overhaul (production hardening, GitHub Actions)
- Renamed uppercase filenames to lowercase
- Replaced Node.js prerequisite with Bun in README
- Updated architecture diagram

### Removed

- Docs directory and all README references
- Unused CrossfadeImage component
- architecture.html (rendered PNG retained)

### Security

- Bumped dependencies to fix vulnerabilities
- Updated librespot to 0.8

## [0.3.0] — 2025-07-20

### Added

- Tauri updater plugin integration
- QA gates / pre-release checklist
- Security audit with cargo-audit
- Type drift check (typeshare-generated types in sync)
- Code quality checks (knip, cspell, cargo-udeps)

### Fixed

- CI pipeline fixes (Tauri deps, format, typecheck, eslint)
- Gnome-keyring startup in CI for Rust tests
- Trigger CI on master branch instead of main
- Security advisory ignores for librespot-only vulnerabilities

### Changed

- Bumped dependencies for vulnerability fixes
- Updated librespot to 0.8
- Renamed documentation filenames to lowercase

## [0.2.0] — 2025-07-18

### Added

- BrowseView with personalized genres, sticky nav dropdown
- Podcast support: Rust API + frontend views + library tab
- NowPlayingView, StatsView, offline cache, Sidebar navigation
- Auto-queue, playback timer, optional scopes
- Context menus, sidebar collapse, player polish, view modes
- Architecture diagram

### Fixed

- Album art flicker and placeholder issues
- Progress bar seek and animation
- Cross-window state sync
- Custom apps blocked by CSP
- Mods folder button and path resolution

## [0.1.0] — 2025-07-16

### Added

- Initial project scaffold: Tauri v2 + React 19 + TypeScript
- Spotify OAuth with PKCE authorization flow
- Playback via Spotify Web Playback SDK (WebSDK engine)
- REST API client for Spotify Web API
- Basic player controls (play, pause, next, previous, seek, volume, shuffle, repeat)
- Personal library views (playlists, liked tracks, albums, artists, shows)
- Search and browse functionality
- MiniPlayer with full transport controls
- Mod system with theme support (Spicetify-compatible)
- Offline cache for API responses
- Stats view for listening history
- Architecture and design documentation
- CI/CD pipeline with GitHub Actions

[0.4.0]: https://github.com/SankalpKrish/Litetify/releases/tag/v0.4.0
[0.3.0]: https://github.com/SankalpKrish/Litetify/releases/tag/v0.3.0
[0.2.0]: https://github.com/SankalpKrish/Litetify/releases/tag/v0.2.0
[0.1.0]: https://github.com/SankalpKrish/Litetify/releases/tag/v0.1.0
