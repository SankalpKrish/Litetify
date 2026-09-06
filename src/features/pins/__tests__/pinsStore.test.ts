import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PinnedItem } from '../pinsStore';

const mockConfig = vi.hoisted(() => ({
  config: {
    getCached: vi.fn(() => ({ pins: [] as string[] })),
    update: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/config', () => mockConfig);

import { usePinsStore } from '../pinsStore';

function pin(id: string, name: string): PinnedItem {
  return {
    id,
    name,
    image: '',
    uri: `spotify:playlist:${id}`,
    type: 'playlist',
  };
}

const alpha = pin('a', 'Alpha');
const beta = pin('b', 'Beta');
const gamma = pin('c', 'Gamma');

describe('usePinsStore.reorder', () => {
  beforeEach(() => {
    mockConfig.config.update.mockClear();
    usePinsStore.setState({ pins: [alpha, beta, gamma] });
  });

  it('reorders pins and persists the new order', () => {
    usePinsStore.getState().reorder(0, 2);

    expect(usePinsStore.getState().pins.map((p) => p.uri)).toEqual([
      beta.uri,
      gamma.uri,
      alpha.uri,
    ]);
    expect(mockConfig.config.update).toHaveBeenCalledWith({
      pins: [beta, gamma, alpha].map((p) => JSON.stringify(p)),
    });
  });

  it('does not persist when the index does not change', () => {
    usePinsStore.getState().reorder(1, 1);
    expect(usePinsStore.getState().pins).toEqual([alpha, beta, gamma]);
    expect(mockConfig.config.update).not.toHaveBeenCalled();
  });

  it('ignores out-of-range indexes', () => {
    usePinsStore.getState().reorder(0, 9);
    expect(usePinsStore.getState().pins).toEqual([alpha, beta, gamma]);
    expect(mockConfig.config.update).not.toHaveBeenCalled();
  });
});
