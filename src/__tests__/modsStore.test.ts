import { describe, it, expect, beforeEach } from 'vitest';
import { useModsStore } from '../mods/store';
import type { ModEntry } from '../mods/manifest';

function mod(
  path: string,
  type: 'theme' | 'extension' | 'app',
  enabled = false,
): ModEntry {
  return {
    path,
    enabled,
    manifest: {
      name: path,
      version: '1.0.0',
      type,
      entry: 'index.css',
      litetifyApiVersion: '1',
    },
  };
}

describe('toggleEnabled', () => {
  beforeEach(() => {
    useModsStore.setState({
      registry: [
        mod('latte', 'theme', true),
        mod('mocha', 'theme'),
        mod('eq', 'extension', true),
      ],
    });
  });

  it('keeps only one theme enabled', () => {
    useModsStore.getState().toggleEnabled('mocha');
    const byPath = Object.fromEntries(
      useModsStore.getState().registry.map((m) => [m.path, m.enabled]),
    );
    expect(byPath).toEqual({ latte: false, mocha: true, eq: true });
  });

  it('lets non-theme mods stay independently enabled', () => {
    useModsStore.getState().toggleEnabled('eq');
    const byPath = Object.fromEntries(
      useModsStore.getState().registry.map((m) => [m.path, m.enabled]),
    );
    expect(byPath).toEqual({ latte: true, mocha: false, eq: false });
  });
});
