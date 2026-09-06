import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlaylist } from '../usePlaylist';
import { createWrapper } from './test-utils';
import { apiGetPlaylist } from '../../api';

vi.mock('../../api', () => ({
  apiGetPlaylist: vi.fn(),
}));

const mockPlaylist = {
  id: 'playlist1',
  name: 'Detailed Playlist',
  description: 'A detailed playlist',
  images: [{ url: 'https://example.com/image.jpg', height: 300, width: 300 }],
  owner: { id: 'user1', display_name: 'User' },
  public: true,
  followers: { total: 100 },
  tracks: {
    items: [
      {
        id: 'track1',
        name: 'Track 1',
        uri: 'spotify:track:track1',
        duration_ms: 200000,
        artists: [
          { id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' },
        ],
        disc_number: 1,
        track_number: 1,
        explicit: false,
        type: 'track',
      },
    ],
    total: 1,
    offset: 0,
    limit: 50,
  },
  type: 'playlist',
};

describe('usePlaylist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when id is empty', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePlaylist(''), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches a single playlist by id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(apiGetPlaylist).mockResolvedValue(mockPlaylist as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePlaylist('playlist1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPlaylist);
    expect(result.current.data?.name).toBe('Detailed Playlist');
    expect(apiGetPlaylist).toHaveBeenCalledWith('playlist1', undefined);
  });

  it('passes fields parameter to the API', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(apiGetPlaylist).mockResolvedValue(mockPlaylist as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePlaylist('playlist1', 'name,id'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiGetPlaylist).toHaveBeenCalledWith('playlist1', 'name,id');
  });

  it('returns error state on API failure', { timeout: 15000 }, async () => {
    vi.mocked(apiGetPlaylist).mockRejectedValue(
      new Error('Playlist not found'),
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePlaylist('bad-id'), { wrapper });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 10000 },
    );

    expect(result.current.error).toBeDefined();
  });
});
