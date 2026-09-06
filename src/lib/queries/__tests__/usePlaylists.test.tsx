import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlaylists } from '../usePlaylists';
import { createWrapper } from './test-utils';
import { apiGetPlaylists } from '../../api';
import type { SpotifyPlaylists } from '../../types';

vi.mock('../../api', () => ({
  apiGetPlaylists: vi.fn(),
}));

const mockPlaylists: SpotifyPlaylists = {
  items: [
    {
      id: 'playlist1',
      name: 'Test Playlist',
      description: 'A test playlist',
      public: true,
      collaborative: false,
      owner: { id: 'user1', display_name: 'User' },
      images: [
        { url: 'https://example.com/image.jpg', height: 300, width: 300 },
      ],
      tracks: {
        total: 10,
        href: 'https://api.spotify.com/v1/playlists/playlist1/tracks',
      },
      type: 'playlist',
    },
  ],
  total: 1,
  offset: 0,
  limit: 20,
};

describe('usePlaylists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches playlists with default params', async () => {
    vi.mocked(apiGetPlaylists).mockResolvedValue(mockPlaylists);

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePlaylists(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPlaylists);
    expect(apiGetPlaylists).toHaveBeenCalledWith(undefined, undefined);
  });

  it('passes limit and offset to the API', async () => {
    vi.mocked(apiGetPlaylists).mockResolvedValue(mockPlaylists);

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePlaylists(10, 0), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiGetPlaylists).toHaveBeenCalledWith(10, 0);
  });

  it('returns error state on API failure', { timeout: 15000 }, async () => {
    vi.mocked(apiGetPlaylists).mockRejectedValue(new Error('Failed to fetch'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePlaylists(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 10000 },
    );

    expect(result.current.error).toBeDefined();
  });
});
