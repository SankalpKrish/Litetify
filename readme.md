<p align="center">
  <img src="public/litetify.svg" width="96" height="96" alt="Litetify" />
</p>

<h1 align="center">Litetify</h1>

<p align="center">
  A lightweight, moddable Spotify Premium desktop client.<br />
 Small, fast and fully yours to customise.
</p>

<p align="center">
  <a href="https://github.com/SankalpKrish/Litetify/actions/workflows/ci.yml"><img src="https://github.com/SankalpKrish/Litetify/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/SankalpKrish/Litetify/actions/workflows/release.yml"><img src="https://github.com/SankalpKrish/Litetify/actions/workflows/release.yml/badge.svg" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-d8e2e0?labelColor=08090b" alt="MIT License" /></a>
</p>

---

Litetify is a Tauri v2 + React 19 desktop app for Spotify Premium. It uses the Spotify Web Playback SDK, stores tokens in the OS keychain, and loads themes, extensions, and custom apps from a `mods/` folder without a rebuild.

**Spotify Premium is required.** Free-tier accounts cannot use the Web Playback SDK.

Litetify is not affiliated with Spotify AB.

---

## Features

- **Playback** - play, pause, seek, volume, next, previous, shuffle, repeat, and OS media keys
- **Library** - playlists, liked songs, albums, artists, and podcasts
- **Home** - recently played, top artists, top tracks, and your playlists
- **Search** - tracks, artists, albums, and playlists
- **Auth** - Authorization Code with PKCE; tokens live in the OS keychain; Premium is checked at login
- **Mods** - CSS themes, sandboxed extensions, and custom sidebar apps dropped into `mods/`
- **Updates** - in-app update checks via Tauri updater

---

## Install

Installers are published on the [Releases](https://github.com/SankalpKrish/Litetify/releases) page.

To run from source:

```bash
git clone https://github.com/SankalpKrish/Litetify.git
cd Litetify
bun install
bun run tauri dev
```

You need **Bun >= 1.3**, a **stable Rust** toolchain, and the [Tauri v2 platform prerequisites](https://v2.tauri.app/start/prerequisites/).

---

## Spotify Client ID

Litetify is a public PKCE client. No client secret is shipped. Each user supplies a Client ID.

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add this redirect URI exactly: `http://127.0.0.1:14523/callback`
3. Paste the **Client ID** into the Litetify login screen.

The Client ID is saved in app config. Access and refresh tokens are stored in the OS keychain.

---

## Mods

Drop a package into `mods/` and enable it in Settings.

| Type       | Role                               | Example                             |
| ---------- | ---------------------------------- | ----------------------------------- |
| Theme      | Override design tokens with CSS    | `mods/examples/dark-theme/`         |
| Extension  | Sandboxed JS via `window.Litetify` | `mods/examples/skip-to-favorite/`   |
| Custom app | Full page as a sidebar tab         | See `docs/development.md` section 9 |

Shipped Catppuccin themes: Frappe, Latte, Macchiato, Mocha.

See [security.md](security.md) for the sandbox model.

---

## Scripts

| Command               | Purpose                      |
| --------------------- | ---------------------------- |
| `bun run tauri dev`   | Desktop app (Rust + webview) |
| `bun run dev`         | Vite UI only                 |
| `bun run tauri build` | Native installers            |
| `bun run lint`        | ESLint, zero warnings        |
| `bun run typecheck`   | `tsc --noEmit`               |
| `bun run test`        | Vitest                       |
| `bun run test:rust`   | Cargo tests                  |

Contributor setup: [docs/getting-started.md](docs/getting-started.md), [architecture.md](architecture.md), [contributing.md](contributing.md).

---

## License

[MIT](LICENSE) - Copyright (c) 2025–2026 Sankalp Krish

**Disclaimer.** Litetify is an independent project. It is not affiliated with or endorsed by Spotify AB. “Spotify” is a registered trademark of Spotify AB.
