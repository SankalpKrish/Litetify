import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  checkAuth: vi.fn(),
  initMods: vi.fn(),
  apiGetTopArtists: vi.fn(),
  apiGetTopTracks: vi.fn(),
  apiGetRecentlyPlayed: vi.fn(),
  apiGetPlaylists: vi.fn(),
  prefetchQuery: vi.fn(),
}));

vi.mock('../lib/config', () => ({
  config: { init: mocks.init },
}));

vi.mock('../features/auth/authStore', () => ({
  checkAuth: mocks.checkAuth,
}));

vi.mock('../mods', () => ({
  initMods: mocks.initMods,
}));

vi.mock('../lib/api', () => ({
  apiGetTopArtists: mocks.apiGetTopArtists,
  apiGetTopTracks: mocks.apiGetTopTracks,
  apiGetRecentlyPlayed: mocks.apiGetRecentlyPlayed,
  apiGetPlaylists: mocks.apiGetPlaylists,
}));

vi.mock('../lib/queries/queryClient', () => ({
  queryClient: { prefetchQuery: mocks.prefetchQuery },
}));

vi.mock('../features/browse/HomeView', () => ({
  HomeView: () => null,
}));

import { prepareApp } from '../boot';

describe('prepareApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.init.mockResolvedValue({});
    mocks.initMods.mockResolvedValue(undefined);
    mocks.prefetchQuery.mockResolvedValue(undefined);
  });

  it('stops after auth when there is no session', async () => {
    mocks.checkAuth.mockResolvedValue(false);
    await expect(prepareApp()).resolves.toBe('unauthenticated');
    expect(mocks.initMods).not.toHaveBeenCalled();
    expect(mocks.prefetchQuery).not.toHaveBeenCalled();
  });

  it('loads Home data when authenticated', async () => {
    mocks.checkAuth.mockResolvedValue(true);
    await expect(prepareApp()).resolves.toBe('authenticated');
    expect(mocks.initMods).not.toHaveBeenCalled();
    expect(mocks.prefetchQuery).toHaveBeenCalledTimes(4);
  });
});
