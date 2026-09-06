# Litetify mods

User-installed mods live in this `mods/` directory. The directory is
**gitignored** except this `examples/` folder, so your installed mods stay local.

A full authoring guide (`manifest.json` schema, the `window.Litetify` API
reference, theme/extension/custom-app tutorials) ships with **Phase 5** at
`docs/MODDING.md`.

## Mod types (preview)

- **theme** — CSS that overrides Litetify's design tokens.
- **extension** — JS that runs in a sandbox and talks to the app only through
  the versioned `window.Litetify` API.
- **app** — registers a new sidebar tab with a custom view.

Each mod is a folder containing a `manifest.json` plus its entry file. Example
mods (one of each type) are added in Phase 5, Task 5.8.
