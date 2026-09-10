# Contributing to Litetify

First off, thank you for considering contributing to Litetify. It means a lot.

Litetify is a lightweight, performant, moddable Spotify Premium desktop client built on **Tauri v2 (Rust) + React 19 / TypeScript**. This document outlines how to contribute, what standards we follow, and what you can expect from the process.

---

## Table of Contents

- [License](#license)
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Quality Standards](#code-quality-standards)
- [Testing Expectations](#testing-expectations)
- [Pull Request Process](#pull-request-process)
- [Mod Development Guidelines](#mod-development-guidelines)
- [Reporting Issues](#reporting-issues)
- [Security Vulnerabilities](#security-vulnerabilities)

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE). Litetify is and will remain free and open-source software.

---

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) code of conduct. We expect all participants - contributors, maintainers, and users alike - to foster a respectful, inclusive, and harassment-free environment.

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the maintainers.

---

## Getting Started

### Prerequisites

- **Bun** >=1.3 - [install guide](https://bun.sh/docs/installation)
- **Rust stable toolchain** - [rustup](https://rustup.rs/) (MSRV: 1.77.2)
- **Node.js** >=20 - required by some tooling (the project provides an `.nvmrc`)
- **Platform build dependencies** for [Tauri v2](https://tauri.app/start/prerequisites/):
  - **Windows**: WebView2 (ships with Windows 11, available via runtime on Windows 10) and [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with the "Desktop development with C++" workload
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `libwebkit2gtk-4.1-dev`, `librsvg2-dev`, `patchelf`, `libxdo-dev`, `libappindicator3-dev`

### Setup

```bash
# Clone the repository
git clone https://github.com/SankalpKrish/Litetify.git
cd Litetify

# Install frontend dependencies
bun install

# Start the full desktop app (Rust backend + webview)
bun run tauri dev
```

See [docs/getting-started.md](docs/getting-started.md) for a detailed walkthrough, including Spotify Client ID setup and troubleshooting.

---

## Development Workflow

### Branching

- **`main`** - the main development branch. All pull requests target `main`.
- Feature branches should be created from `main` and follow a descriptive naming pattern: e.g., `feat/add-crossfade`, `fix/seek-accuracy`, `refactor/player-engine`.

### Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

Types used in this project:

| Type       | Usage                                                   |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `style`    | Formatting, Prettier, or CSS-only changes               |
| `test`     | Adding or updating tests                                |
| `docs`     | Documentation changes                                   |
| `chore`    | Build, CI, dependency updates                           |
| `perf`     | Performance improvements                                |
| `security` | Vulnerability fixes                                     |

Examples:

```
feat: add librespot native audio engine
fix: handle empty playlist state gracefully
docs: update API endpoint references in architecture.md
```

### Before You Start

If you are planning a significant feature or refactor, please open an issue first to discuss the approach. This saves everyone time and ensures alignment with the project's direction.

---

## Code Quality Standards

All contributions must pass the following checks before being accepted:

### ESLint (zero-warning policy)

```bash
bun run lint
```

The project enforces a strict zero-warning policy. ESLint is configured with `@typescript-eslint` recommended rules and React Hooks linting. Any warning or error must be resolved before merging.

### Prettier

```bash
bun run format:check   # verify formatting
bun run format         # auto-format
```

Prettier configuration (`semi: true`, `singleQuote: true`, `trailingComma: "all"`, `printWidth: 80`). All code must be formatted consistently.

### TypeScript strict mode

```bash
bun run typecheck      # tsc --noEmit
```

TypeScript is configured with `strict: true`, `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`. The type-check gate runs in CI and must pass.

### Rust code quality

Rust code must pass:

```bash
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

Clippy warnings are treated as errors. Rust code should be formatted with `rustfmt` using the project configuration (`max_width: 100`, `edition: 2021`).

### Spell checking

```bash
bun run spellcheck     # cspell --no-progress .
```

Custom project-specific words are maintained in [`cspell.json`](cspell.json). Add new project-specific terms there if spell-check fails on legitimate identifiers.

### Dead code detection

```bash
bun run knip
```

[Knip](https://github.com/webpro/knip) checks for unused files, exports, and dependencies. Known-use files (mod examples, generated types, test files, mod runtime internals) are excluded via [`knip.json`](knip.json). New contributions should not introduce dead code.

---

## Testing Expectations

### Frontend tests (Vitest)

```bash
bun run test           # vitest run
```

Frontend tests use **Vitest** with **jsdom** environment, **@testing-library/react**, and **@testing-library/jest-dom**. Test files live alongside the modules they test, following the convention `src/**/__tests__/*.test.ts(x)` or co-located `*.test.ts(x)` files.

- Unit tests for utility functions and hooks
- Component tests for UI behavior
- Smoke tests for critical flows

### Rust tests (cargo test)

```bash
bun run test:rust      # cargo test --manifest-path src-tauri/Cargo.toml
```

Rust unit tests use `mockito` for HTTP mocking where needed. Tests cover API proxy logic, auth token management, and mod scanning infrastructure.

### CI test gates

Both frontend and Rust test suites run in CI. All tests must pass for a pull request to be merged.

---

## Pull Request Process

1. **Create a feature branch** from `main` with a descriptive name.
2. **Make your changes**, following the code quality standards above.
3. **Run all local checks** before opening a PR:

```bash
bun run typecheck
bun run lint
bun run test
bun run test:rust
bun run format:check
```

4. **Open a pull request** against `main`. Provide a clear title following conventional commits and a description explaining what the change does and why.
5. **CI runs automatically** with the following gates that must pass:

| Job              | What it checks                                                       |
| ---------------- | -------------------------------------------------------------------- |
| `lint`           | ESLint zero-warnings + Clippy                                        |
| `format`         | Prettier formatting                                                  |
| `typecheck`      | TypeScript `tsc --noEmit`                                            |
| `test`           | Vitest frontend + cargo test Rust                                    |
| `build`          | `tsc --noEmit` + Vite production build                               |
| `security-audit` | `cargo audit` for Rust dependency vulnerabilities                    |
| `code-quality`   | Knip (unused code), cspell (spellcheck), cargo-udeps (informational) |

6. **Address any feedback** from reviewers. PRs require at least one maintainer approval before merging.
7. **Squash-merge** is preferred to keep the commit history clean on `main`.

---

## Mod Development Guidelines

Litetify supports three types of mods:

| Type           | What it does                                                      |
| -------------- | ----------------------------------------------------------------- |
| **Theme**      | CSS that overrides design tokens to change the look               |
| **Extension**  | Sandboxed JavaScript talking to the app via `window.Litetify` API |
| **Custom App** | Full-page view that registers as a new sidebar tab                |

### Mod structure

Each mod is a folder in the `mods/` directory containing a `manifest.json` and entry files:

```
mods/
  my-mod/
    manifest.json
    styles.css       (themes)
    main.js          (extensions / apps)
```

### Important rules

- **Extensions run in sandboxed iframes** with no access to `ipc:` or Tauri commands. They communicate exclusively through the versioned `window.Litetify` API.
- **Themes inject CSS** into the app's design system. They can override any CSS custom property (`--lt-*` tokens). Avoid `!important` where possible - prefer token overrides.
- **Custom apps** register via the manifest and appear as sidebar entries. They receive their own view and routing context.
- **The `mods/` directory is gitignored** except for the `mods/examples/` folder. Commit example mods only - keep personal mods private.

A full authoring guide is maintained in `docs/development.md` section 9. See the `mods/examples/` directory for reference implementations.

---

## Reporting Issues

### Bug reports

If you find a bug, please open a [GitHub issue](https://github.com/SankalpKrish/Litetify/issues) with:

- A clear, descriptive title
- Steps to reproduce (be specific)
- Expected vs. actual behavior
- Environment details (OS, Litetify version, playback engine)
- Screenshots or screen recordings if applicable

### Feature requests

Feature requests are welcome. Please open a [GitHub issue](https://github.com/SankalpKrish/Litetify/issues) with:

- A clear description of the feature and its motivation
- How it fits into Litetify as a lightweight Spotify client
- Any relevant context or prior art

For significant features, consider discussing the approach in an issue before implementing.

---

## Security Vulnerabilities

If you discover a security vulnerability in Litetify, please **do not** open a public GitHub issue.

Instead, report it privately via the [GitHub Security Advisory](https://github.com/SankalpKrish/Litetify/security/advisories/new) page.

See [security.md](security.md) for details on:

- Authentication (PKCE OAuth flow, OS keychain token storage)
- Scope of the application (Rust backend, React frontend, mod system)
- Mod security model (sandboxed iframes, no IPC access)
- Supported versions (latest tagged release only)
