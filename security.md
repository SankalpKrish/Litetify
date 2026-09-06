# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Litetify, please report it privately by opening a **GitHub Security Advisory** at:

https://github.com/SankalpKrish/Litetify/security/advisories/new

Please do **not** report security vulnerabilities via public GitHub issues.

## Authentication

Litetify uses the **Authorization Code with PKCE** flow (RFC 7636) for Spotify OAuth. Access tokens and refresh tokens are stored in the **OS keyring** via the `keyring` crate (system credential store), not in plaintext files. No client secret is ever shipped with the application.

## Scope

- **src-tauri/** (Rust backend) -- handles OAuth token exchange, API proxying, and native playback via librespot
- **src/** (React/TypeScript frontend) -- runs in the Tauri webview, communicates with the Rust backend through Tauri's IPC
- **mods/** -- user-installed third-party mods (themes, extensions, apps) loaded from the local filesystem

## Mod Security

Extensions run in sandboxed iframes with no access to `ipc:` or Tauri commands. See the modding documentation for the full security model.

## Supported Versions

Only the latest tagged release receives security patches.
