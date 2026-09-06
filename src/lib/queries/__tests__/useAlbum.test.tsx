import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAlbum } from '../useAlbum';
import { createWrapper } from './test-utils';
import { apiGetAlbum } from '../../api';

vi.mock('../../api', () => ({
  apiGetAlbum: vi.fn(),
}));

const mockAlbum = {
  id: 'album1',
  name: 'Test Album',
  artists: [
    { id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' },
  ],
  images: [{ url: 'https://example.com/image.jpg', height: 300, width: 300 }],
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
  release_date: '2024',
  total_tracks: 1,
  label: 'Test Label',
  popularity: 75,
  genres: ['pop', 'rock'],
  type: 'album',
};

describe('useAlbum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when id is empty', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAlbum(''), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches album data by id', async () => {
    vi.mocked(apiGetAlbum).mockResolvedValue(mockAlbum);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAlbum('album1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAlbum);
    expect(result.current.data?.name).toBe('Test Album');
    expect(apiGetAlbum).toHaveBeenCalledWith('album1');
  });

  it('returns error state on API failure', { timeout: 15000 }, async () => {
    vi.mocked(apiGetAlbum).mockRejectedValue(new Error('Album not found'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAlbum('bad-id'), { wrapper });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 10000 },
    );

    expect(result.current.error).toBeDefined();
  });
});
