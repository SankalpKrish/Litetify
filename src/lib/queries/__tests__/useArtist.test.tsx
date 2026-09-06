import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useArtist,
  useArtistTopTracks,
  useArtistAlbums,
  useRelatedArtists,
  useIsFollowingArtist,
} from '../useArtist';
import { createWrapper } from './test-utils';
import {
  apiGetArtist,
  apiGetArtistTopTracks,
  apiGetArtistAlbums,
  apiGetRelatedArtists,
  apiCheckFollowArtist,
} from '../../api';

// Mock the api module
vi.mock('../../api', () => ({
  apiGetArtist: vi.fn(),
  apiGetArtistTopTracks: vi.fn(),
  apiGetArtistAlbums: vi.fn(),
  apiGetRelatedArtists: vi.fn(),
  apiCheckFollowArtist: vi.fn(),
}));

const mockArtist = {
  id: 'artist1',
  name: 'Test Artist',
  images: [{ url: 'https://example.com/image.jpg', height: 300, width: 300 }],
  genres: ['pop', 'rock'],
  popularity: 80,
  followers: { total: 1000000 },
  uri: 'spotify:artist:artist1',
  type: 'artist',
};

describe('useArtist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when id is empty', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useArtist(''), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches artist data by id', async () => {
    vi.mocked(apiGetArtist).mockResolvedValue(mockArtist);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useArtist('artist1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockArtist);
    expect(result.current.data?.name).toBe('Test Artist');
    expect(apiGetArtist).toHaveBeenCalledWith('artist1');
  });

  it('returns error state on API failure', { timeout: 15000 }, async () => {
    vi.mocked(apiGetArtist).mockRejectedValue(new Error('Artist not found'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useArtist('invalid-id'), { wrapper });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 10000 },
    );

    expect(result.current.error).toBeDefined();
  });
});

describe('useArtistTopTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches top tracks for an artist', async () => {
    const mockTopTracks = {
      tracks: [
        {
          id: 'track1',
          name: 'Hit Song',
          uri: 'spotify:track:track1',
          duration_ms: 180000,
          artists: [
            {
              id: 'artist1',
              name: 'Test Artist',
              uri: 'spotify:artist:artist1',
            },
          ],
          album: null,
          disc_number: 1,
          track_number: 1,
          explicit: false,
          type: 'track',
        },
      ],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(apiGetArtistTopTracks).mockResolvedValue(mockTopTracks as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useArtistTopTracks('artist1', 'US'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTopTracks);
    expect(result.current.data?.tracks).toHaveLength(1);
    expect(apiGetArtistTopTracks).toHaveBeenCalledWith('artist1', 'US');
  });
});

describe('useArtistAlbums', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches albums for an artist', async () => {
    const mockAlbums = {
      items: [
        {
          id: 'album1',
          name: 'Greatest Hits',
          images: [],
          uri: 'spotify:album:album1',
          release_date: '2024',
        },
      ],
      total: 1,
      offset: 0,
      limit: 20,
      next: null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(apiGetArtistAlbums).mockResolvedValue(mockAlbums as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useArtistAlbums('artist1', 20, 0), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAlbums);
    expect(apiGetArtistAlbums).toHaveBeenCalledWith('artist1', 20, 0);
  });
});

describe('useRelatedArtists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches related artists', async () => {
    const mockRelated = {
      artists: [
        {
          id: 'artist2',
          name: 'Related Artist',
          images: [],
          genres: ['pop'],
          popularity: 70,
          followers: { total: 500000 },
          uri: 'spotify:artist:artist2',
          type: 'artist',
        },
      ],
    };
    vi.mocked(apiGetRelatedArtists).mockResolvedValue(mockRelated);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRelatedArtists('artist1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRelated);
    expect(apiGetRelatedArtists).toHaveBeenCalledWith('artist1');
  });
});

describe('useIsFollowingArtist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks if user follows an artist', async () => {
    vi.mocked(apiCheckFollowArtist).mockResolvedValue(true);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useIsFollowingArtist('artist1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(true);
    expect(apiCheckFollowArtist).toHaveBeenCalledWith('artist1');
  });

  it('returns false when not following', async () => {
    vi.mocked(apiCheckFollowArtist).mockResolvedValue(false);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useIsFollowingArtist('artist1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
  });
});
