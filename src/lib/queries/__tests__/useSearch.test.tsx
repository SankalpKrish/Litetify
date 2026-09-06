import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSearch } from '../useSearch';
import { createWrapper } from './test-utils';
import { apiSearch } from '../../api';
import type { SearchResult } from '../../types';

// Mock the api module
vi.mock('../../api', () => ({
  apiSearch: vi.fn(),
}));

const mockSearchResult: SearchResult = {
  tracks: {
    items: [
      {
        id: 'track1',
        name: 'Test Track',
        uri: 'spotify:track:track1',
        duration_ms: 200000,
        artists: [
          { id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' },
        ],
        album: {
          id: 'album1',
          name: 'Test Album',
          images: [],
          uri: 'spotify:album:album1',
          release_date: '2024',
        },
        disc_number: 1,
        track_number: 1,
        explicit: false,
        type: 'track',
      },
    ],
    total: 1,
  },
};

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially when query is provided', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearch('test'), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('is disabled when query is empty string', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearch(''), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches search results when query is provided', async () => {
    vi.mocked(apiSearch).mockResolvedValue(mockSearchResult);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearch('test'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSearchResult);
    expect(apiSearch).toHaveBeenCalledWith(
      'test',
      ['track', 'artist', 'album', 'playlist'],
      undefined,
      undefined,
      undefined,
    );
  });

  it('passes custom search types, limit, and offset', async () => {
    vi.mocked(apiSearch).mockResolvedValue(mockSearchResult);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useSearch('test', ['track'], 10, 0, 'US'),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiSearch).toHaveBeenCalledWith('test', ['track'], 10, 0, 'US');
  });

  it(
    'returns error state when API call fails',
    { timeout: 15000 },
    async () => {
      const testError = new Error('API error');
      vi.mocked(apiSearch).mockRejectedValue(testError);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSearch('test'), { wrapper });

      await waitFor(
        () => {
          expect(result.current.status).toBe('error');
        },
        { timeout: 5000 },
      );

      expect(result.current.error).toBeDefined();
    },
  );
});
