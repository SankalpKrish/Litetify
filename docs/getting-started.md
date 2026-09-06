# Getting Started with Litetify

A walkthrough for setting up and running Litetify on your machine for the first time.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone and Install](#clone-and-install)
- [Spotify Client ID Setup](#spotify-client-id-setup)
- [Configuration](#configuration)
- [Running in Development Mode](#running-in-development-mode)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Spotify Premium Account

Litetify uses the Spotify Web Playback SDK, which **requires a Spotify Premium subscription**. A free-tier account will not work.

### Bun (>=1.3)

Litetify uses Bun as its package manager and JavaScript runtime. Install it:

```powershell
# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# macOS / Linux
curl -fsSL https://bun.sh/install | bash
```

Verify the installation:

```bash
bun --version
# Should print >= 1.3.0
```

### Rust Stable Toolchain

The Tauri backend compiles to native Rust. Install via [rustup](https://rustup.rs):

```bash
# Follow the prompts; default options are fine
rustup-init.exe       # Windows
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  # macOS / Linux
```

Verify:

```bash
rustc --version
# Should print stable, e.g. rustc 1.77.2 or later
```

### WebView2 (Windows)

WebView2 is the platform runtime that hosts the Litetify UI.

- **Windows 11**: Ships pre-installed. No action needed.
- **Windows 10**: Download and install the [Evergreen Bootstrapper](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) from Microsoft. Most Windows 10 systems already have it via Microsoft Edge updates.
- **Linux** (`libwebkit2gtk-4.1-dev`): Refer to the [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/).
- **macOS**: Xcode Command Line Tools. On recent macOS versions, running `xcode-select --install` will prompt the installation.

### Node.js (>=20)

The project's test runner and some tooling need Node.js. If you use `nvm` / `fnm`, the project provides an `.nvmrc` pinning Node 24. Bun itself is the primary runtime, but Node must be installed as well.

### Additional System Dependencies (Linux only)

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev \
  patchelf libxdo-dev
```

See the [Tauri v2 system dependencies guide](https://tauri.app/start/prerequisites/) for the complete, up-to-date list for your distribution.

---

## Clone and Install

Clone the repository and install frontend dependencies:

```bash
git clone https://github.com/SankalpKrish/Litetify.git
cd Litetify
bun install
```

`bun install` fetches all JavaScript dependencies (React, Vite, Zustand, etc.) and installs the `@tauri-apps/cli` binary for the `tauri` command.

---

## Spotify Client ID Setup

Litetify is a **public desktop app** using the Authorization Code with PKCE flow -- it never ships or stores a client secret. Each user supplies their own Spotify Client ID.

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Log in with your Spotify account.
3. Click **Create app**.
4. Fill in the details:
   - **App name**: `Litetify` (or anything you like)
   - **App description**: `Litetify desktop client`
   - **Redirect URI**: Add exactly `http://127.0.0.1:14523/callback`
   - **API to use**: Check **Web API**
5. Click **Save**.
6. In the app's main page, click **Settings** and verify that `http://127.0.0.1:14523/callback` appears under **Redirect URIs**.
7. Copy the **Client ID** (a 32-character hex string) from the app overview page next to the app name.

> **Important:** Use `127.0.0.1`, not `localhost`. Spotify removed support for `localhost` and HTTP hostname redirect URIs on 2025-11-27.

> **Note:** You do not need a Client Secret. PKCE works without one.

---

## Configuration

Litetify reads its configuration from three possible sources (later overrides earlier):

1. **Compile-time defaults** -- hard-coded in the Rust backend.
2. **`.env` file** (development convenience) -- placed at the project root.
3. **In-app Settings UI** -- changes made at runtime are persisted to the OS keychain and the Tauri store plugin.

### Option A: `.env` File (Recommended for Dev)

Create a file named `.env` in the project root:

```env
VITE_SPOTIFY_CLIENT_ID=your_32_char_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:14523/callback
```

The `VITE_SPOTIFY_REDIRECT_URI` variable has a correct default already compiled in. You only need to set it if you changed the port in the Spotify Dashboard.

### Option B: Enter at Runtime (Any Mode)

If you skip the `.env` file, Litetify will show a login screen on first launch where you can paste your Client ID directly. This value is stored securely in your OS keychain (via the `keyring` crate) and will be remembered for subsequent launches.

### Configuration Precedence

```
Compile-time defaults < config.json on disk < .env file < Settings UI
```

For a full reference of every configuration mechanism, see [configuration.md](configuration.md).

---

## Running in Development Mode

Start the full desktop application with hot-reload:

```bash
bun run tauri dev
```

This command does two things in parallel:

1. Starts the **Vite dev server** on `http://localhost:1420` (port 1420; HMR uses port 1421).
2. Compiles and launches the **Rust backend** and opens the Tauri webview window pointed at the Vite dev server.

The first compile will take longer as Cargo downloads and builds all Rust dependencies (reqwest, keyring, tiny_http, sha2, etc.). Subsequent runs use cached artifacts.

Once the window opens, you should see the Litetify login screen:

1. If you set `VITE_SPOTIFY_CLIENT_ID` in `.env`, authentication starts automatically.
2. Otherwise, enter your Client ID in the text field and click **Login**.
3. Your default browser opens a Spotify accounts page asking you to authorize Litetify.
4. After authorizing, Spotify redirects to `http://127.0.0.1:14523/callback`, the app finishes authentication, and the main interface loads.

The React frontend supports hot module replacement -- changes to `src/` components appear instantly without restarting the Rust process. Rust changes require stopping the process (`Ctrl+C`) and re-running `bun run tauri dev`.

### Web-only Dev Mode

If you are working on UI components and do not need the Rust backend, start just the Vite dev server:

```bash
bun run dev
```

This serves the UI at `http://localhost:1420` without the Tauri shell. Authentication and playback will not work in this mode because they depend on Rust IPC commands. It is useful for rapid visual iteration on styles and layout.

---

## Building for Production

Create a standalone native installer:

```bash
bun run tauri build
```

This runs:

1. `tsc --noEmit` (TypeScript type checking).
2. `vite build` (bundles frontend into `dist/`).
3. `cargo build --release` (compiles the Rust backend with optimizations).
4. The Tauri bundler packages the result into platform-specific installer(s).

Output is written to `src-tauri/target/release/bundle/`:

| Platform | Installer Format     |
| -------- | -------------------- |
| Windows  | `.msi` / `.exe`      |
| macOS    | `.dmg`               |
| Linux    | `.deb` / `.AppImage` |

### Building with librespot

By default, Litetify uses the Spotify Web Playback SDK for audio. To enable the native librespot engine:

```bash
cd src-tauri
cargo build --features librespot
cd ..
bun run tauri build
```

### Build Notes

- The Rust release profile optimizes for binary size (`opt-level = "s"`, `lto = true`, `strip = true`, `panic = "abort"`).
- First production build may take several minutes as Cargo compiles dependencies from scratch.

---

## Troubleshooting

### "bun install" fails with network errors

Try clearing the cache and retrying:

```bash
bun install --no-cache
```

If Bun itself is not found, ensure it is on your `PATH`. Restart your terminal after installing.

### Rust build fails with missing linker or MSVC tools

On Windows, ensure you have the MSVC build tools installed. When you install Rust via `rustup-init.exe`, choose **"Default host triple"** matching `x86_64-pc-windows-msvc`. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with the "Desktop development with C++" workload, or install [Visual Studio 2022 Community Edition](https://visualstudio.microsoft.com/vs/community/) with the same workload.

### "WebView2" not found error

- **Windows 11**: Ensure all updates are installed.
- **Windows 10**: Download the [Evergreen WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
- **Linux**: Install `libwebkit2gtk-4.1-dev` as listed in the prerequisites.

### Spotify login redirects to a page that says "Invalid redirect URI"

Double-check the redirect URI in your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):

- It must be exactly `http://127.0.0.1:14523/callback`.
- `localhost` does not work. Use the IP literal `127.0.0.1`.
- Verify there are no trailing slashes or extra whitespace.

### "Only Spotify Premium accounts can use this feature"

Your Spotify account does not have an active Premium subscription. Litetify requires Spotify Premium because it uses the Web Playback SDK, which is a Premium-only feature.

### "bun run tauri dev" opens a blank window

- Check the terminal output for Vite errors. Ensure port 1420 is not already in use.
- If you have another Litetify instance or Tauri app running on port 1420, stop it first.
- Verify your `.env` file is at the project root (not inside `src-tauri/` or another subdirectory).

### Rust dependencies fail to compile

- Ensure you are on the Rust stable channel: `rustup default stable`.
- Update Rust: `rustup update`.
- If a specific crate fails, try cleaning the Cargo cache: `cargo clean --manifest-path src-tauri/Cargo.toml && bun run tauri dev`.

### The app compiles but the UI shows a white screen with no login prompt

- Open the Tauri webview developer tools (right-click > Inspect or configure devtools in `tauri.conf.json`) and check the console for errors.
- Verify the Vite dev server is running (`http://localhost:1420` loads in your regular browser).
- If using the web-only dev server (`bun run dev`), authentication and playback will not work because they depend on the Rust IPC bridge.

### OS keychain prompts appear repeatedly

Litetify stores tokens in your OS keychain. On the first authentication, your OS may prompt you to allow access. On subsequent launches, the keychain may prompt again depending on your OS security settings:

- **Windows**: Credential Manager prompts are normal on first use.
- **macOS**: The keychain dialog may appear each time the app binary changes (e.g., after recompiling in dev mode).
- **Linux**: Ensure a keychain daemon (such as gnome-keyring or kwallet) is running.

---

## Next Steps

- Explore the [mod system](../README.md#mod-system) to customize Litetify with themes, extensions, and custom apps.
- Read the [architecture document](../architecture.md) for a deep understanding of how the app is structured.
- Check out the [configuration reference](configuration.md) for every configurable option.
- See the `mods/examples/` directory for sample themes and extensions.
