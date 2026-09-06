import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlaylistTracks } from '../usePlaylistTracks';
import { createWrapper } from './test-utils';
import { apiGetPlaylistTracks } from '../../api';

vi.mock('../../api', () => ({
  apiGetPlaylistTracks: vi.fn(),
}));

const trackItem = {
  id: 'track1',
  name: 'Playlist Track',
  uri: 'spotify:track:track1',
  duration_ms: 180000,
  artists: [
    { id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' },
  ],
  disc_number: 1,
  track_number: 1,
  explicit: false,
  type: 'track',
};

const mockPage = {
  items: [trackItem],
  total: 1,
  offset: 0,
  limit: 50,
};

const _mockMultiPage = {
  items: [
    { ...trackItem, id: 'track1' },
    { ...trackItem, id: 'track2' },
    { ...trackItem, id: 'track3' },
  ],
  total: 3,
  offset: 0,
  limit: 2,
  next: 'https://api.spotify.com/v1/playlists/p1/tracks?offset=2&limit=2',
};
void _mockMultiPage;

const _mockSecondPage = {
  items: [{ ...trackItem, id: 'track3' }],
  total: 3,
  offset: 2,
  limit: 2,
};
void _mockSecondPage;

describe('usePlaylistTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when playlistId is empty', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePlaylistTracks(''), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches first page of playlist tracks', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(apiGetPlaylistTracks).mockResolvedValue(mockPage as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePlaylistTracks('playlist1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.total).toBe(1);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toEqual(trackItem);
    expect(apiGetPlaylistTracks).toHaveBeenCalledWith('playlist1', 50, 0);
  });

  it('returns empty items when data is undefined', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePlaylistTracks('playlist1'), {
      wrapper,
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('returns error state on API failure', { timeout: 15000 }, async () => {
    vi.mocked(apiGetPlaylistTracks).mockRejectedValue(
      new Error('Failed to load'),
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePlaylistTracks('bad-id'), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 10000 },
    );

    expect(result.current.error).toBeDefined();
  });
});
