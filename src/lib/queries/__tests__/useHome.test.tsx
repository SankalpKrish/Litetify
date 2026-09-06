import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useTopArtists,
  useTopTracks,
  useRecentlyPlayed,
  useHomePlaylists,
} from '../useHome';
import { createWrapper } from './test-utils';
import {
  apiGetTopArtists,
  apiGetTopTracks,
  apiGetRecentlyPlayed,
  apiGetPlaylists,
} from '../../api';
import type {
  TopArtists,
  TopTracks,
  RecentlyPlayed,
  SpotifyPlaylists,
} from '../../types';

vi.mock('../../api', () => ({
  apiGetTopArtists: vi.fn(),
  apiGetTopTracks: vi.fn(),
  apiGetRecentlyPlayed: vi.fn(),
  apiGetPlaylists: vi.fn(),
}));

const mockTopArtists: TopArtists = {
  items: [
    {
      id: 'artist1',
      name: 'Top Artist',
      images: [],
      genres: ['pop'],
      popularity: 80,
      followers: { total: 1000 },
      uri: 'spotify:artist:artist1',
      type: 'artist',
    },
  ],
  total: 1,
  offset: 0,
  limit: 6,
};

const mockTopTracks: TopTracks = {
  items: [
    {
      id: 'track1',
      name: 'Top Track',
      uri: 'spotify:track:track1',
      duration_ms: 200000,
      artists: [
        { id: 'artist1', name: 'Top Artist', uri: 'spotify:artist:artist1' },
      ],
      disc_number: 1,
      track_number: 1,
      explicit: false,
      type: 'track',
    },
  ],
  total: 1,
  offset: 0,
  limit: 6,
};

const mockRecentlyPlayed: RecentlyPlayed = {
  items: [
    {
      track: {
        id: 'track1',
        name: 'Recent Track',
        uri: 'spotify:track:track1',
        duration_ms: 180000,
        artists: [
          {
            id: 'artist1',
            name: 'Recent Artist',
            uri: 'spotify:artist:artist1',
          },
        ],
        disc_number: 1,
        track_number: 1,
        explicit: false,
        type: 'track',
      },
      played_at: '2024-01-01T00:00:00Z',
    },
  ],
};

const mockPlaylists: SpotifyPlaylists = {
  items: [
    {
      id: 'playlist1',
      name: 'Home Playlist',
      description: '',
      public: true,
      collaborative: false,
      owner: { id: 'user1', display_name: 'User' },
      images: [],
      tracks: { total: 5, href: '' },
      type: 'playlist',
    },
  ],
  total: 1,
  offset: 0,
  limit: 6,
};

describe('useTopArtists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches top artists with default limit', async () => {
    vi.mocked(apiGetTopArtists).mockResolvedValue(mockTopArtists);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTopArtists(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTopArtists);
    expect(apiGetTopArtists).toHaveBeenCalledWith(6);
  });

  it('passes custom limit param', async () => {
    vi.mocked(apiGetTopArtists).mockResolvedValue(mockTopArtists);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTopArtists(10), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiGetTopArtists).toHaveBeenCalledWith(10);
  });

  it('returns error state on API failure', { timeout: 15000 }, async () => {
    vi.mocked(apiGetTopArtists).mockRejectedValue(new Error('Failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTopArtists(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 10000 },
    );

    expect(result.current.error).toBeDefined();
  });
});

describe('useTopTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches top tracks with default limit', async () => {
    vi.mocked(apiGetTopTracks).mockResolvedValue(mockTopTracks);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTopTracks(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTopTracks);
    expect(apiGetTopTracks).toHaveBeenCalledWith(6);
  });

  it('passes custom limit', async () => {
    vi.mocked(apiGetTopTracks).mockResolvedValue(mockTopTracks);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTopTracks(20), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiGetTopTracks).toHaveBeenCalledWith(20);
  });
});

describe('useRecentlyPlayed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches recently played tracks', async () => {
    vi.mocked(apiGetRecentlyPlayed).mockResolvedValue(mockRecentlyPlayed);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecentlyPlayed(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRecentlyPlayed);
    expect(apiGetRecentlyPlayed).toHaveBeenCalledWith(6);
  });

  it('passes custom limit', async () => {
    vi.mocked(apiGetRecentlyPlayed).mockResolvedValue(mockRecentlyPlayed);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecentlyPlayed(10), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiGetRecentlyPlayed).toHaveBeenCalledWith(10);
  });
});

describe('useHomePlaylists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches home playlists', async () => {
    vi.mocked(apiGetPlaylists).mockResolvedValue(mockPlaylists);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useHomePlaylists(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPlaylists);
    expect(apiGetPlaylists).toHaveBeenCalledWith(6);
  });
});
