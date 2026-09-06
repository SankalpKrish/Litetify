/**
 * Typed config client for Litetify.
 *
 * Wraps the Tauri store plugin with a typed `LitetifyConfig` interface.
 * All config is persisted via `tauri-plugin-store` on the Rust side.
 *
 * === Sync cache ===
 * On app init, call `init()` to populate an in-memory cache from the Tauri store.
 * After that, `getCached()` provides fast synchronous reads — no Tauri invoke needed.
 * Writes via `update()` or `save()` update both the cache and the Tauri store.
 *
 * @example
 *   import { config } from '@/lib/config'
 *   config.getCached().volume          // sync read
 *   await config.update({ volume: 0.5 })  // async write
 */

import { invoke } from '@tauri-apps/api/core';

export interface LitetifyConfig {
  clientId: string | null;
  engineType: string;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  volume: number;
  shuffle: boolean;
  repeat: string;
  pins: string[];
  lastView: string | null;
}

const DEFAULTS: LitetifyConfig = {
  clientId: null,
  engineType: 'websdk',
  sidebarCollapsed: false,
  sidebarWidth: 240,
  volume: 0.7,
  shuffle: false,
  repeat: 'off',
  pins: [],
  lastView: null,
};

// ---------------------------------------------------------------------------
// In-memory sync cache — populated once during app init.
// ---------------------------------------------------------------------------

let _cache: LitetifyConfig | null = null;

/** Read config synchronously from the in-memory cache (returns defaults if not loaded yet). */
export function getCached(): LitetifyConfig {
  return _cache ? { ..._cache } : { ...DEFAULTS };
}

/** Initialize the cache from the Tauri store. Call once during app startup. */
export async function init(): Promise<LitetifyConfig> {
  try {
    const cfg = await invoke<LitetifyConfig>('get_config');
    _cache = { ...DEFAULTS, ...cfg };
    return { ..._cache };
  } catch (err) {
    console.warn('[config] init failed, using defaults:', err);
    _cache = { ...DEFAULTS };
    return { ..._cache };
  }
}

// ---------------------------------------------------------------------------
// Async persistence operations.
// ---------------------------------------------------------------------------

/**
 * Fresh-load the saved config from the Tauri store (bypasses cache).
 */
export async function load(): Promise<LitetifyConfig> {
  try {
    const cfg = await invoke<LitetifyConfig>('get_config');
    return { ...DEFAULTS, ...cfg };
  } catch (err) {
    console.warn('[config] load failed, using defaults:', err);
    return { ...DEFAULTS };
  }
}

/**
 * Replace the entire config in both the cache and the Tauri store.
 */
export async function save(config: LitetifyConfig): Promise<void> {
  _cache = { ...config };
  await invoke('set_config', { config });
}

/**
 * Update a partial config: writes to cache + Tauri store.
 */
export async function update(
  partial: Partial<LitetifyConfig>,
): Promise<LitetifyConfig> {
  const current = getCached();
  const next = { ...current, ...partial };
  await save(next);
  return next;
}

/**
 * Reset to factory defaults.
 */
export async function reset(): Promise<LitetifyConfig> {
  try {
    const cfg = await invoke<LitetifyConfig>('reset_config');
    _cache = { ...cfg };
    return { ..._cache };
  } catch (err) {
    console.warn('[config] reset failed, using defaults:', err);
    _cache = { ...DEFAULTS };
    return { ..._cache };
  }
}

// ---------------------------------------------------------------------------
// Convenience namespace — groups all exports under a single `config` object
// for ergonomic imports like `import { config } from '@/lib/config'`.
// ---------------------------------------------------------------------------
export const config = {
  getCached,
  init,
  load,
  save,
  update,
  reset,
};
