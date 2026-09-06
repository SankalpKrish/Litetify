import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSavedShows, useShow, useShowEpisodes } from '../useShows';
import { createWrapper } from './test-utils';
import { apiGetSavedShows, apiGetShow, apiGetShowEpisodes } from '../../api';
import type {
  SpotifyShowPage,
  SpotifyShow,
  ShowEpisodesPage,
} from '../../types';

vi.mock('../../api', () => ({
  apiGetSavedShows: vi.fn(),
  apiGetShow: vi.fn(),
  apiGetShowEpisodes: vi.fn(),
}));

const mockSavedShows: SpotifyShowPage = {
  items: [
    {
      id: 'show1',
      name: 'Test Show',
      description: 'A test podcast',
      publisher: 'Test Publisher',
      images: [
        { url: 'https://example.com/image.jpg', height: 300, width: 300 },
      ],
      total_episodes: 10,
      explicit: false,
      type: 'show',
    },
  ],
  total: 1,
  offset: 0,
  limit: 50,
};

const mockShow: SpotifyShow = {
  id: 'show1',
  name: 'Test Show',
  description: 'A test podcast',
  publisher: 'Test Publisher',
  images: [{ url: 'https://example.com/image.jpg', height: 300, width: 300 }],
  total_episodes: 10,
  explicit: false,
  type: 'show',
};

const mockEpisodes: ShowEpisodesPage = {
  items: [
    {
      id: 'ep1',
      name: 'Episode 1',
      description: 'First episode',
      duration_ms: 1800000,
      explicit: false,
      release_date: '2024-01-01',
      images: [{ url: 'https://example.com/ep.jpg', height: 300, width: 300 }],
      uri: 'spotify:episode:ep1',
      type: 'episode',
    },
  ],
  total: 1,
  offset: 0,
  limit: 50,
};

describe('useSavedShows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches saved shows', async () => {
    vi.mocked(apiGetSavedShows).mockResolvedValue(mockSavedShows);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSavedShows(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSavedShows);
    expect(apiGetSavedShows).toHaveBeenCalledWith(50, 0);
  });

  it('passes limit and offset params', async () => {
    vi.mocked(apiGetSavedShows).mockResolvedValue(mockSavedShows);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSavedShows(10, 20), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiGetSavedShows).toHaveBeenCalledWith(10, 20);
  });

  it('returns error state on API failure', { timeout: 15000 }, async () => {
    vi.mocked(apiGetSavedShows).mockRejectedValue(new Error('Failed to fetch'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSavedShows(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 10000 },
    );

    expect(result.current.error).toBeDefined();
  });
});

describe('useShow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when id is empty', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useShow(''), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches show by id', async () => {
    vi.mocked(apiGetShow).mockResolvedValue(mockShow);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useShow('show1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockShow);
    expect(apiGetShow).toHaveBeenCalledWith('show1');
  });
});

describe('useShowEpisodes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when id is empty', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useShowEpisodes(''), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches episodes for a show', async () => {
    vi.mocked(apiGetShowEpisodes).mockResolvedValue(mockEpisodes);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useShowEpisodes('show1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockEpisodes);
    expect(apiGetShowEpisodes).toHaveBeenCalledWith('show1', 50, 0);
  });

  it('passes limit and offset params', async () => {
    vi.mocked(apiGetShowEpisodes).mockResolvedValue(mockEpisodes);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useShowEpisodes('show1', 5, 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiGetShowEpisodes).toHaveBeenCalledWith('show1', 5, 10);
  });
});
