import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useCurrentlyPlaying,
  useAvailableDevices,
  useTransferPlayback,
} from '../usePlayer';
import { createWrapper } from './test-utils';
import {
  apiGetCurrentlyPlaying,
  apiGetAvailableDevices,
  apiTransferPlayback,
} from '../../api';

// Mock the api module
vi.mock('../../api', () => ({
  apiGetCurrentlyPlaying: vi.fn(),
  apiGetAvailableDevices: vi.fn(),
  apiTransferPlayback: vi.fn(),
}));

const mockTrack = {
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
    images: [{ url: 'https://example.com/image.jpg', height: 300, width: 300 }],
    uri: 'spotify:album:album1',
    release_date: '2024',
  },
  disc_number: 1,
  track_number: 1,
  explicit: false,
  type: 'track',
};

const mockCurrentlyPlaying = {
  item: mockTrack,
  is_playing: true,
  progress_ms: 50000,
  device: {
    id: 'device1',
    name: 'Computer',
    is_active: true,
    volume_percent: 50,
  },
};

describe('useCurrentlyPlaying', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCurrentlyPlaying(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('returns currently playing track data on success', async () => {
    vi.mocked(apiGetCurrentlyPlaying).mockResolvedValue(mockCurrentlyPlaying);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCurrentlyPlaying(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCurrentlyPlaying);
    expect(result.current.data?.item?.name).toBe('Test Track');
  });

  it('returns null when nothing is playing', async () => {
    vi.mocked(apiGetCurrentlyPlaying).mockResolvedValue(null);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCurrentlyPlaying(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it(
    'returns error state when API call fails',
    { timeout: 15000 },
    async () => {
      vi.mocked(apiGetCurrentlyPlaying).mockRejectedValue(
        new Error('Network error'),
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCurrentlyPlaying(), { wrapper });

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

describe('useAvailableDevices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches devices on mount', async () => {
    const mockDevices = [
      { id: 'device1', name: 'Computer', is_active: true, volume_percent: 80 },
      { id: 'device2', name: 'Phone', is_active: false, volume_percent: 50 },
    ];
    vi.mocked(apiGetAvailableDevices).mockResolvedValue(mockDevices);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAvailableDevices(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDevices);
    expect(result.current.data).toHaveLength(2);
  });

  it('returns error state on failure', { timeout: 15000 }, async () => {
    vi.mocked(apiGetAvailableDevices).mockRejectedValue(
      new Error('Failed to fetch devices'),
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAvailableDevices(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 5000 },
    );
  });
});

describe('useTransferPlayback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls apiTransferPlayback with device IDs', async () => {
    vi.mocked(apiTransferPlayback).mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTransferPlayback(), { wrapper });

    result.current.mutate({ deviceIds: ['device1'], play: true });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiTransferPlayback).toHaveBeenCalledWith(['device1'], true);
  });
});
