import { invoke } from '@tauri-apps/api/core';
import type { ModEntry } from './manifest';
import { useModsStore } from './store';
import { loadTheme } from './themes';
import { loadExtension } from './sandbox';
import { loadCustomApp } from './apps';

export interface RawModEntry {
  path: string;
  name: string;
  version: string;
  mod_type: string;
  entry: string;
  description: string | null;
  author: string | null;
  litetify_api_version: string;
  permissions: string[];
  icon: string | null;
  error: string | null;
}

function mapType(t: string): 'theme' | 'extension' | 'app' {
  switch (t.toLowerCase()) {
    case 'theme':
      return 'theme';
    case 'extension':
      return 'extension';
    case 'app':
      return 'app';
    default:
      return 'extension';
  }
}

function rawToEntry(raw: RawModEntry): ModEntry {
  return {
    path: raw.path,
    manifest: {
      name: raw.name,
      version: raw.version,
      type: mapType(raw.mod_type),
      entry: raw.entry,
      description: raw.description ?? undefined,
      author: raw.author ?? undefined,
      litetifyApiVersion: raw.litetify_api_version,
      permissions: raw.permissions,
      icon: raw.icon ?? undefined,
    },
    enabled: false,
    error: raw.error ?? undefined,
  };
}

const ENABLED_KEY = 'litetify:mods:enabled';
const ACTIVE_THEME_KEY = 'litetify:mods:activeTheme';

function loadPersistedState(): {
  enabled: string[];
  activeTheme: string | null;
} {
  try {
    const enabled = JSON.parse(localStorage.getItem(ENABLED_KEY) ?? '[]');
    const activeTheme = localStorage.getItem(ACTIVE_THEME_KEY);
    return { enabled: Array.isArray(enabled) ? enabled : [], activeTheme };
  } catch {
    return { enabled: [], activeTheme: null };
  }
}

function persistEnabled(enabled: string[]): void {
  localStorage.setItem(ENABLED_KEY, JSON.stringify(enabled));
}

function persistActiveTheme(theme: string | null): void {
  if (theme) {
    localStorage.setItem(ACTIVE_THEME_KEY, theme);
  } else {
    localStorage.removeItem(ACTIVE_THEME_KEY);
  }
}

export async function scanMods(): Promise<ModEntry[]> {
  const raw = await invoke<RawModEntry[]>('scan_mods');
  const persisted = loadPersistedState();
  const mods = raw.map((r) => {
    const entry = rawToEntry(r);
    entry.enabled = persisted.enabled.includes(entry.path);
    return entry;
  });
  const enabledThemes = mods.filter(
    (m) => m.manifest.type === 'theme' && m.enabled,
  );
  if (enabledThemes.length <= 1) return mods;
  const keep =
    enabledThemes.find((m) => m.manifest.name === persisted.activeTheme) ??
    enabledThemes[enabledThemes.length - 1];
  return mods.map((m) =>
    m.manifest.type === 'theme' ? { ...m, enabled: m.path === keep.path } : m,
  );
}

export async function loadEnabledMods(): Promise<void> {
  const store = useModsStore.getState();
  const registry = store.registry;
  const persisted = loadPersistedState();

  store.setActiveTheme(persisted.activeTheme);

  for (const mod of registry) {
    if (!mod.enabled || mod.error) continue;

    try {
      switch (mod.manifest.type) {
        case 'theme':
          await loadTheme(mod);
          break;
        case 'extension':
          await loadExtension(mod);
          break;
        case 'app':
          await loadCustomApp(mod);
          break;
      }
    } catch (err) {
      console.error(`[mods] Failed to load ${mod.manifest.name}:`, err);
    }
  }
}

export async function initMods(): Promise<void> {
  const registry = await scanMods();
  const store = useModsStore.getState();
  store.setRegistry(registry);
  await loadEnabledMods();
}

export function persistEnabledState(): void {
  const store = useModsStore.getState();
  const enabledPaths = store.registry
    .filter((m) => m.enabled)
    .map((m) => m.path);
  persistEnabled(enabledPaths);
}

export function persistActiveThemeState(name: string | null): void {
  persistActiveTheme(name);
}

export async function readModFile(
  modPath: string,
  filePath: string,
): Promise<string> {
  return invoke<string>('read_mod_file', { modPath, filePath });
}
