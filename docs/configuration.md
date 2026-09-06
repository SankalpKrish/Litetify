# Configuration

Litetify uses a layered configuration model. This document covers every
configuration mechanism in the project, from the Tauri desktop shell down to
CI pipelines.

---

## 1. Tauri Configuration

**File:** `src-tauri/tauri.conf.json`

The root configuration for the Tauri v2 desktop shell. References the
`https://schema.tauri.app/config/2` JSON Schema.

### Metadata

```json
{
  "productName": "Litetify",
  "version": "0.4.0",
  "identifier": "com.litetify.app"
}
```

The bundle identifier is used for OS-level app identification and updater
channel management.

### Build

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  }
}
```

- `beforeDevCommand`: starts the Vite dev server during development.
- `devUrl`: the URL Tauri opens in the webview for hot-reload development.
- `beforeBuildCommand`: builds the frontend into `../dist` before the Rust
  compilation step.
- `frontendDist`: path to the production frontend build, relative to the
  `src-tauri/` directory.

### Window

```json
{
  "windows": [
    {
      "title": "Litetify",
      "width": 1100,
      "height": 720,
      "minWidth": 720,
      "minHeight": 480,
      "resizable": true,
      "fullscreen": false
    }
  ]
}
```

A single main window with a 1100x720 default size, a minimum size of
720x480, and fullscreen disabled. The window is resizable.

<!-- VERIFY: a second "mini-player" window capability is defined in capabilities/default.json but no second window entry exists in tauri.conf.json windows array; the mini-player may be created at runtime via core:webview:allow-create-webview-window. -->

### Security (CSP)

```json
{
  "security": {
    "csp": "default-src 'self'; img-src 'self' data: https://*.scdn.co https://*.spotifycdn.com; connect-src 'self' https://api.spotify.com https://accounts.spotify.com https://*.spotify.com wss://*.spotify.com https://*.scdn.co https://*.spotifycdn.com ipc: http://ipc.localhost; script-src 'self' blob: https://sdk.scdn.co; style-src 'self' 'unsafe-inline'; frame-src 'self' https://sdk.scdn.co https://*.spotify.com; media-src 'self' blob: https://*.scdn.co; worker-src 'self' blob:"
  }
}
```

The Content Security Policy is restrictive to the application origin and
explicit Spotify domains:

- `default-src 'self'` -- baseline restriction.
- `img-src` -- allows Spotify CDN images (`*.scdn.co`, `*.spotifycdn.com`)
  and inline data URIs.
- `connect-src` -- permits API calls to `api.spotify.com`,
  `accounts.spotify.com`, WebSocket connections to `*.spotify.com`, and the
  Tauri IPC bridge (`ipc:`, `http://ipc.localhost`).
- `script-src` -- allows `blob:` for the Web SDK script and the Spotify SDK
  CDN.
- `style-src` -- allows `'unsafe-inline'` for CSS-in-JS libraries.
- `frame-src` -- allows embedding the Spotify SDK and Web Playback SDK
  frames.
- `media-src` -- allows `blob:` and Spotify CDN for audio playback.
- `worker-src` -- allows `blob:` for Web Workers.

### Bundle

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

- `targets: "all"` produces platform-native installers for the current OS.
- Icons are provided for both macOS (`.icns`) and Windows (`.ico`) formats
  plus PNG fallbacks.

### Updater

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "dialog": true,
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDJBNTExRDBGNTA4RTFEQ0QKUldUTkhZNVFEeDFSS3F3eTBHWVNaUEI0N1RObVBYbWdGMHNxcktFbkxIZ0VidDVBRjhubC9HWlAK",
      "endpoints": [
        "https://github.com/SankalpKrish/Litetify/releases/latest/download/latest.json"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

The built-in Tauri updater checks for new releases from the GitHub Releases
page. On Windows the installer runs in passive mode (no interactive prompts).

---

## 2. Environment Variables

**File:** `.env.example`

```env
# Spotify application Client ID (public — safe to expose in a desktop app).
VITE_SPOTIFY_CLIENT_ID=

# Loopback redirect the app listens on. Must EXACTLY match a redirect URI
# registered in the Spotify dashboard.
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:14523/callback
```

| Variable                    | Required | Description                                             |
| --------------------------- | -------- | ------------------------------------------------------- |
| `VITE_SPOTIFY_CLIENT_ID`    | No *     | Spotify Developer application Client ID for PKCE OAuth. |
| `VITE_SPOTIFY_REDIRECT_URI` | No *     | Loopback redirect URI for the OAuth callback.           |

\* Both variables are optional at the file level because the application
provides a Settings UI where the user can enter the Client ID at runtime.
The `.env` file is a development convenience only.

The loopback IP literal `127.0.0.1` is required because Spotify removed
support for `localhost` and HTTP hostname redirect URIs on 2025-11-27.

---

## 3. Runtime Config (Rust Store Plugin)

Litetify manages persistent user settings through the Tauri store plugin
(`tauri-plugin-store`), stored as a JSON file on disk
(`$APPCONFIG/config.json`).

### Rust Side

**File:** `src-tauri/src/config.rs`

The `LitetifyConfig` struct holds all user-persisted values:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LitetifyConfig {
    pub client_id: Option<String>,     // Spotify Client ID for PKCE auth
    pub engine_type: String,           // "websdk" or "librespot"
    pub sidebar_collapsed: bool,       // Left sidebar collapsed state
    pub volume: f64,                   // Last volume level (0.0–1.0)
    pub shuffle: bool,                 // Shuffle enabled
    pub repeat: String,                // "off", "context", or "track"
    pub pins: Vec<String>,             // Pinned sidebar items (Spotify URIs)
    pub last_view: Option<String>,     // Last selected navigation view
}
```

Defaults:

| Field               | Default    |
| ------------------- | ---------- |
| `client_id`         | `None`     |
| `engine_type`       | `"websdk"` |
| `sidebar_collapsed` | `false`    |
| `volume`            | `0.7`      |
| `shuffle`           | `false`    |
| `repeat`            | `"off"`    |
| `pins`              | `[]`       |
| `last_view`         | `None`     |

### Tauri Commands

Three commands are exposed to the frontend via `#[tauri::command]`:

| Command        | Signature                                      | Description                    |
| -------------- | ---------------------------------------------- | ------------------------------ |
| `get_config`   | `async fn(AppHandle) -> LitetifyConfig`        | Read persisted config.         |
| `set_config`   | `async fn(AppHandle, config: LitetifyConfig) ` | Persist a full config object.  |
| `reset_config` | `async fn(AppHandle) -> LitetifyConfig`        | Reset to defaults and persist. |

### Frontend Client

**File:** `src/lib/config.ts`

Provides a typed client with an in-memory sync cache:

| Export               | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `config.init()`      | Populates the cache from the store (call once at startup). |
| `config.getCached()` | Synchronous read from the in-memory cache.                 |
| `config.load()`      | Fresh-load from the Tauri store (bypasses cache).          |
| `config.save()`      | Replace the entire config in cache and store.              |
| `config.update()`    | Partial merge into cache and store.                        |
| `config.reset()`     | Reset to factory defaults.                                 |

---

## 4. TypeScript / ESLint / Prettier

### TypeScript

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "vite.config.ts"]
}
```

Key settings:

- **`strict: true`** -- enables all strict type-checking options.
- **`@/*`** path alias resolves to `src/*` (used in all imports).
- **`noUnusedLocals` / `noUnusedParameters`** -- errors on dead code.
- **`noUncheckedSideEffectImports`** -- extra safety for side-effect imports.
- **`skipLibCheck: true`** -- faster compilation by skipping `.d.ts` checking
  in `node_modules`.

### ESLint

**File:** `eslint.config.js`

Uses the ESLint flat config format with `typescript-eslint`:

- Extends `@eslint/js` recommended rules and `typescript-eslint` recommended
  rules.
- Applies `react-hooks` plugin (recommended ruleset) and `react-refresh`
  plugin (warns on non-component exports).
- Custom rule: `@typescript-eslint/no-unused-vars` errors with
  `argsIgnorePattern: '^_'` and `varsIgnorePattern: '^_'`.
- Ignores `dist`, `src-tauri/target`, `node_modules`, `coverage`.
- Target files: `**/*.{ts,tsx}`.

### Prettier

**Files:** `.prettierrc`, `.prettierignore`

**`.prettierrc`:**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80,
  "tabWidth": 2
}
```

**`.prettierignore`:** ignores `dist`, `node_modules`, `src-tauri/target`,
`src-tauri/gen`, `coverage`, lock files.

Scripts:

- `bun run format` -- formats all files in place.
- `bun run format:check` -- checks formatting without writing (CI).

---

## 5. Build Configuration

### Vite

**File:** `vite.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
```

| Setting             | Value                              | Notes                                  |
| ------------------- | ---------------------------------- | -------------------------------------- |
| Plugin              | `@vitejs/plugin-react`             | React Fast Refresh, JSX transform.     |
| Alias (`@`)         | `./src`                            | Matches tsconfig paths.                |
| `server.port`       | `1420`                             | Fixed port for Tauri webview.          |
| `server.strictPort` | `true`                             | Fails if port 1420 is taken.           |
| `server.hmr.port`   | `1421` (when `TAURI_DEV_HOST` set) | HMR WebSocket port.                    |
| `clearScreen`       | `false`                            | Prevents Vite from hiding Rust errors. |
| `build.target`      | `es2021`                           | Compatible with Tauri webview.         |
| `build.minify`      | `esbuild`                          | Fast minification.                     |
| `build.sourcemap`   | `false`                            | No sourcemaps in production.           |

**Code splitting**: manual chunks separate `vendor` (React, ReactDOM),
`query` (`@tanstack/react-query`), `player`, `auth`, `settings`, and `mods`
for optimized loading.

**Watching:** `src-tauri/**` is excluded from the Vite file watcher -- Rust
changes are handled by Cargo.

### Package.json Scripts

**File:** `package.json`

| Script           | Command                                           |
| ---------------- | ------------------------------------------------- |
| `dev`            | `vite`                                            |
| `build`          | `tsc --noEmit && vite build`                      |
| `tauri`          | `tauri` (CLI passthrough)                         |
| `lint`           | `eslint . --max-warnings 0`                       |
| `format`         | `prettier --write .`                              |
| `format:check`   | `prettier --check .`                              |
| `typecheck`      | `tsc --noEmit`                                    |
| `test`           | `vitest run`                                      |
| `test:rust`      | `cargo test --manifest-path src-tauri/Cargo.toml` |
| `types:generate` | `typeshare src-tauri/src/ --lang=typescript ...`  |
| `knip`           | `knip`                                            |
| `spellcheck`     | `cspell --no-progress .`                          |

Node engine requirements: `>=20`. Bun engine: `>=1.3`.

### Cargo.toml (Rust)

**File:** `src-tauri/Cargo.toml`

| Section            | Key entries                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package metadata   | `name = "litetify"`, `version = "0.4.0"`, `edition = "2021"`, `rust-version = "1.77.2"`                                                                                                                                                                                   |
| Library targets    | `staticlib`, `cdylib`, `rlib`                                                                                                                                                                                                                                             |
| Build dependencies | `tauri-build 2`, `vergen 9.0.6` (optional)                                                                                                                                                                                                                                |
| Dependencies       | `tauri 2`, `tauri-plugin-opener 2`, `open 5`, `tauri-plugin-updater 2`, `serde 1`, `serde_json 1`, `reqwest 0.12`, `sha2 0.10`, `base64 0.22`, `tiny_http 0.12`, `keyring 2`, `rand 0.8`, `url 2`, `chrono 0.4`, `tokio 1`, `librespot 0.8` (optional), `typeshare 1.0.5` |
| Dev dependencies   | `mockito 1`                                                                                                                                                                                                                                                               |
| Features           | `default = []`, `librespot = ["dep:librespot", "dep:vergen"]`                                                                                                                                                                                                             |

The `librespot` feature is opt-in. When disabled (the default), playback
uses the Spotify Web Playback SDK exclusively. Enabling it compiles
librespot with the rodio audio backend and rustls TLS.

### Build Script

**File:** `src-tauri/build.rs`

```rust
fn main() {
    tauri_build::build()
}
```

Standard Tauri build script that generates the context from
`tauri.conf.json` and the capabilities.

---

## 6. Rust Build Profile

**File:** `src-tauri/Cargo.toml` -- `[profile.release]` section

```toml
[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

| Setting         | Value     | Effect                                                   |
| --------------- | --------- | -------------------------------------------------------- |
| `panic`         | `"abort"` | Abort on panic instead of unwinding (smaller binary).    |
| `codegen-units` | `1`       | Maximizes optimizations by compiling in a single unit.   |
| `lto`           | `true`    | Enables link-time optimization across the whole crate.   |
| `opt-level`     | `"s"`     | Optimizes for binary size (preferred for a desktop app). |
| `strip`         | `true`    | Strips symbols from the final binary.                    |

These settings produce a smaller, faster release binary at the cost of
longer compile times.

---

## 7. Rust Toolchain Configuration

### Toolchain

**File:** `src-tauri/rust-toolchain.toml`

```toml
[toolchain]
channel = "stable"
```

Pins the Rust toolchain to `stable`. On Windows this enforces the MSVC
toolchain (the GNU/MinGW target is not supported by Tauri).

### Formatter

**File:** `src-tauri/rustfmt.toml`

```toml
edition = "2021"
max_width = 100
```

- Formatting edition matches the Cargo edition.
- Lines wrap at 100 characters.

---

## 8. CI Configuration

### Continuous Integration

**File:** `.github/workflows/ci.yml`

Runs on every push or pull request to the `master` branch. Uses concurrency
cancellation: in-progress runs on the same ref are cancelled.

<!-- VERIFY: CI runners are GitHub-hosted ubuntu-latest instances. -->

| Job                 | Purpose                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `lint`              | Clippy (Rust) + ESLint (TypeScript).                                                                                   |
| `format`            | Prettier check on all frontend files.                                                                                  |
| `typecheck`         | `tsc --noEmit` for TypeScript type safety.                                                                             |
| `test`              | Vitest (frontend) + Cargo test (Rust, with gnome-keyring for keyring tests).                                           |
| `build`             | Full `bun run build` (typecheck + Vite + implicitly triggers Rust compile). Depends on lint, format, typecheck, test.  |
| `pre-release-gates` | Greps for dev-mode references in `src/` and checks generated types are in sync.                                        |
| `security-audit`    | `cargo audit` for known vulnerability scanning.                                                                        |
| `code-quality`      | `knip` (unused exports), `cspell` (spelling), `cargo-udeps` (unused Rust deps). All continue on error (informational). |

Environment variables:

- `CARGO_TERM_COLOR: always`
- `CARGO_MANIFEST_PATH: src-tauri/Cargo.toml`

Key actions used:

- `actions/checkout@v4`
- `actions-rust-lang/setup-rust-toolchain@v1`
- `oven-sh/setup-bun@v2` (Bun package manager)
- `Swatinem/rust-cache@v2` (Rust build artifact caching)

Linux system dependencies (installed via apt): `libwebkit2gtk-4.1-dev`,
`libappindicator3-dev`, `librsvg2-dev`, `patchelf`, `libxdo-dev`,
`gnome-keyring`, `dbus-x11`.

### Release Pipeline

**File:** `.github/workflows/release.yml`

Triggered on tag push matching `v*` (e.g., `v0.4.0`).

<!-- VERIFY: Release artifacts are built on GitHub-hosted runners for all three platforms. -->

```yaml
permissions:
  contents: write # Required to create GitHub Releases.
```

The pipeline:

1. **ci-check** -- re-runs the full CI workflow via `uses: ./.github/workflows/ci.yml`.
2. **build** -- matrix build across three platforms:
   - `ubuntu-latest` (Linux, `x86_64-unknown-linux-gnu`)
   - `macos-latest` (macOS, `x86_64-apple-darwin`)
   - `windows-latest` (Windows, `x86_64-pc-windows-msvc`)

   Uses `tauri-apps/tauri-action@v0` to build and upload artifacts. Creates
   a draft GitHub Release with platform-specific installers (`.msi`/`.exe`
   for Windows, `.dmg` for macOS, `.deb`/`.AppImage` for Linux).

---

## 9. Supplementary Configuration Files

### EditorConfig

**File:** `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.{rs,toml}]
indent_size = 4

[*.md]
trim_trailing_whitespace = false
```

Ensures consistent editor settings: 2-space indentation for most files,
4-space for Rust and TOML, LF line endings, and preserved trailing
whitespace in Markdown.

### Node Version

**File:** `.nvmrc`

```
24
```

Specifies Node.js major version 24 for `nvm` / `fnm` users. Bun (the
project's package manager) is also supported with a `>=1.3` engine
requirement.

### Dead File Detection (Knip)

**File:** `knip.json`

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "ignore": [
    "mods/examples/**",
    "mods/stats-app/**",
    "src/lib/types.ts",
    "src/lib/types.generated.ts",
    "src/lib/queries/__tests__/*",
    "**/*.test.ts",
    "**/*.test.tsx",
    "src/mods/loader.ts",
    "src/mods/sandbox.ts",
    "src/mods/manifest.ts",
    "src/playback/websdk.ts",
    "src/lib/offline.ts"
  ],
  "ignoreDependencies": []
}
```

Ignores known-use files that Knip would otherwise flag as unused,
including the mod system entry points, the Web SDK playback module, offline
support, and all test files.

### Spell Checking (CSpell)

**File:** `cspell.json`

```json
{
  "version": "0.2",
  "language": "en",
  "words": [/* ~180 project-specific terms */]
}
```

Ignores standard build output paths and lock files. The custom dictionary
includes project terminology: `litetify`, `librespot`, `tauri`, `zustand`,
`typeshare`, `cdylib`, `serde`, `clippy`, playback-related terms
(`crossfade`, `gapless`, `pregap`, `dither`), audio backend names
(`coreaudio`, `wasapi`, `pipewire`, `pulseaudio`), and theme names
(`catppuccin`, `frappe`, `latte`, `mocha`, `macchiato`).

### Tauri Capabilities

**File:** `src-tauri/capabilities/default.json`

```json
[
  {
    "identifier": "default",
    "description": "Default permissions: auth, API, playback, and mod system.",
    "windows": ["main"],
    "permissions": [
      "core:default",
      "opener:default",
      "core:webview:allow-create-webview-window",
      "core:window:allow-close",
      "core:window:allow-set-focus",
      "core:window:allow-center"
    ]
  },
  {
    "identifier": "mini-player",
    "description": "Permissions for the detached mini-player window.",
    "windows": ["mini-player"],
    "permissions": ["core:default", "core:window:allow-close"]
  }
]
```

Defines two permission scopes:

- **default** -- applied to the `main` window, grants core window
  operations plus the ability to create new webview windows (used for
  the mini-player popup).
- **mini-player** -- a restricted scope for the detached compact player
  window, with only core and close permissions.

Generated schemas mirroring the capabilities are produced at build time in
`src-tauri/gen/schemas/`.

---

## Configuration Precedence

Settings are applied in the following order (later overrides earlier):

1. **Compile-time defaults** -- Rust struct `Default` impl (see section 3).
2. **`config.json`** on disk (Tauri store plugin) -- persisted user settings
   survive restarts.
3. **`.env` file** (development only) -- provides `VITE_SPOTIFY_CLIENT_ID`
   and `VITE_SPOTIFY_REDIRECT_URI` for development convenience.
4. **Settings UI** (in-app) -- user changes at runtime go directly to the
   Tauri store and the in-memory cache.

---

## Adding a New Configuration Option

1. Add the field to `LitetifyConfig` in `src-tauri/src/config.rs` with a
   sensible default in the `Default` impl.
2. Regenerate the TypeScript types: `bun run types:generate`.
3. Wire the field into the frontend config client at `src/lib/config.ts`
   (the frontend interface mirrors the Rust struct automatically via
   `typeshare`).
4. (Optional) Add a UI control in the settings views under
   `src/features/settings/`.
