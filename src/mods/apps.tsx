import { readModFile } from './loader';
import { createLitetifyAPI } from './api';
import { useModsStore } from './store';
import { MountContainer, HtmlContainer } from './components';
import { log } from '../lib/debug';
import { filterApiByPermissions } from './permissions';

export async function loadCustomApp(mod: {
  manifest: {
    type: string;
    name: string;
    entry: string;
    permissions?: string[];
    icon?: string;
  };
  path: string;
}): Promise<void> {
  log.mods(
    'loadCustomApp called:',
    mod.path,
    mod.manifest.type,
    mod.manifest.entry,
  );
  if (mod.manifest.type !== 'app') {
    log.mods('skipping, not app type');
    return;
  }

  const code = await readModFile(mod.path, mod.manifest.entry);
  log.mods('readModFile succeeded, code length:', code.length);
  const modId = mod.manifest.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const api = filterApiByPermissions(
    createLitetifyAPI(modId) as unknown as Record<string, unknown>,
    mod.manifest.permissions || [],
  );

  const globals: Record<string, unknown> = {
    console: {
      log: (...args: unknown[]) => console.log('[mod:' + modId + ']', ...args),
      warn: (...args: unknown[]) =>
        console.warn('[mod:' + modId + ']', ...args),
      error: (...args: unknown[]) =>
        console.error('[mod:' + modId + ']', ...args),
    },
    Litetify: api,
  };

  try {
    const cleanCode = code.replace(/;\s*$/, '');
    // CSP-safe evaluation: use Blob URL + dynamic import()
    // instead of new Function() which violates 'unsafe-eval' restriction.
    // Chromium treats blob: as 'self' for script-src, so this passes the CSP.
    const globalsKey = `__mod_g_${modId}__`;
    (window as unknown as Record<string, unknown>)[globalsKey] = globals;
    const moduleSource = [
      `const __g = globalThis.${globalsKey};`,
      'const console = __g.console;',
      'const Litetify = __g.Litetify;',
      `const __result = (${cleanCode});`,
      `delete globalThis.${globalsKey};`,
      'export default __result;',
      `//# sourceURL=mod://${modId}/${mod.manifest.entry}`,
    ].join('\n');
    const blob = new Blob([moduleSource], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);

    let appDef: Record<string, unknown>;
    try {
      const mod = await import(/* @vite-ignore */ url);
      appDef = (
        mod.default && typeof mod.default === 'object' && mod.default !== null
          ? mod.default
          : {}
      ) as Record<string, unknown>;
    } finally {
      URL.revokeObjectURL(url);
      delete (window as unknown as Record<string, unknown>)[globalsKey];
    }
    const label = (appDef.label as string) || mod.manifest.name;

    if (typeof appDef.mount === 'function') {
      const m = appDef.mount as (el: HTMLElement) => void;
      const u =
        typeof appDef.unmount === 'function'
          ? (appDef.unmount as () => void)
          : undefined;
      useModsStore
        .getState()
        .registerCustomView(
          modId,
          label,
          () => <MountContainer mount={m} unmount={u} />,
          mod.manifest.icon,
        );
    } else if (typeof appDef.render === 'function') {
      const renderFn = appDef.render as () => string;
      useModsStore
        .getState()
        .registerCustomView(
          modId,
          label,
          () => <HtmlContainer html={renderFn()} />,
          mod.manifest.icon,
        );
    } else {
      console.warn(
        '[mods] App',
        mod.manifest.name,
        'returned no mount/render function. Keys:',
        Object.keys(appDef),
      );
    }
  } catch (err) {
    console.error(
      "[mods] Failed to load custom app '" + mod.manifest.name + "':",
      err,
    );
  }
}
