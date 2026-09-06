import type { ModEntry } from './manifest';
import { readModFile } from './loader';

const THEME_STYLE_ID_PREFIX = 'litetify-theme-';

function sanitizeCss(css: string): string {
  return css.replace(/url\(\s*(['"]?)[^)'"]+\1\s*\)/gi, 'url()');
}

function getActiveStyleTag(): HTMLStyleElement | null {
  return document.querySelector<HTMLStyleElement>(
    `[id^="${THEME_STYLE_ID_PREFIX}"]`,
  );
}

function removeActiveTheme(): void {
  const existing = getActiveStyleTag();
  if (existing) existing.remove();
}

export async function loadTheme(mod: ModEntry): Promise<void> {
  if (mod.manifest.type !== 'theme') return;

  const css = await readModFile(mod.path, mod.manifest.entry);

  removeActiveTheme();

  const style = document.createElement('style');
  style.id = `${THEME_STYLE_ID_PREFIX}${mod.manifest.name}`;
  style.textContent = sanitizeCss(css);
  document.head.appendChild(style);
}

export function activateTheme(name: string | null, registry: ModEntry[]): void {
  removeActiveTheme();

  if (!name) return;

  const theme = registry.find(
    (m) => m.manifest.name === name && m.manifest.type === 'theme' && m.enabled,
  );
  if (!theme) return;

  loadTheme(theme).catch((err) =>
    console.error(`[mods] Failed to activate theme "${name}":`, err),
  );
}
