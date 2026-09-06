import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLikedTracks } from '../useLikedTracks';
import { createWrapper } from './test-utils';
import { apiGetLikedTracks } from '../../api';
import type { LikedTracks } from '../../types';

vi.mock('../../api', () => ({
  apiGetLikedTracks: vi.fn(),
}));

const mockLikedTracks: LikedTracks = {
  items: [
    {
      added_at: '2024-01-01T00:00:00Z',
      track: {
        id: 'track1',
        name: 'Liked Track',
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
    },
  ],
  total: 1,
  offset: 0,
  limit: 20,
};

describe('useLikedTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches liked tracks with default params', async () => {
    vi.mocked(apiGetLikedTracks).mockResolvedValue(mockLikedTracks);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useLikedTracks(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockLikedTracks);
    expect(apiGetLikedTracks).toHaveBeenCalledWith(undefined, undefined);
  });

  it('passes pagination params', async () => {
    vi.mocked(apiGetLikedTracks).mockResolvedValue(mockLikedTracks);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useLikedTracks(50, 100), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiGetLikedTracks).toHaveBeenCalledWith(50, 100);
  });

  it('returns error state on API failure', { timeout: 15000 }, async () => {
    vi.mocked(apiGetLikedTracks).mockRejectedValue(
      new Error('Failed to fetch'),
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useLikedTracks(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 10000 },
    );

    expect(result.current.error).toBeDefined();
  });
});
