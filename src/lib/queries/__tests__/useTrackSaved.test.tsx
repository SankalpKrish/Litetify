import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTrackSaved } from '../useTrackSaved';
import { createWrapper } from './test-utils';
import {
  apiCheckLibrary,
  apiSaveToLibrary,
  apiRemoveFromLibrary,
} from '../../api';

vi.mock('../../api', () => ({
  apiCheckLibrary: vi.fn(),
  apiSaveToLibrary: vi.fn(),
  apiRemoveFromLibrary: vi.fn(),
}));

describe('useTrackSaved', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isSaved false when not saved', async () => {
    vi.mocked(apiCheckLibrary).mockResolvedValue([false]);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTrackSaved('spotify:track:track1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSaved).toBe(false);
    });
  });

  it('returns isSaved true when track is saved', async () => {
    vi.mocked(apiCheckLibrary).mockResolvedValue([true]);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTrackSaved('spotify:track:track1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSaved).toBe(true);
    });
  });

  it('is disabled when uri is empty', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTrackSaved(''), { wrapper });

    expect(result.current.isSaved).toBe(false);
  });

  it('toggle calls apiSaveToLibrary when track is not saved', async () => {
    vi.mocked(apiCheckLibrary).mockResolvedValue([false]);
    vi.mocked(apiSaveToLibrary).mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTrackSaved('spotify:track:track1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSaved).toBe(false);
    });

    result.current.toggle();

    await waitFor(() => {
      expect(apiSaveToLibrary).toHaveBeenCalledWith(['spotify:track:track1']);
    });
  });

  it('toggle calls apiRemoveFromLibrary when track is saved', async () => {
    vi.mocked(apiCheckLibrary).mockResolvedValue([true]);
    vi.mocked(apiRemoveFromLibrary).mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTrackSaved('spotify:track:track1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSaved).toBe(true);
    });

    result.current.toggle();

    await waitFor(() => {
      expect(apiRemoveFromLibrary).toHaveBeenCalledWith([
        'spotify:track:track1',
      ]);
    });
  });

  it('toggling starts false and becomes true during mutation', async () => {
    vi.mocked(apiCheckLibrary).mockResolvedValue([false]);
    vi.mocked(apiSaveToLibrary).mockImplementation(() => new Promise(() => {}));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTrackSaved('spotify:track:track1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSaved).toBe(false);
    });

    expect(result.current.toggling).toBe(false);
    result.current.toggle();
    await waitFor(() => {
      expect(result.current.toggling).toBe(true);
    });
  });
});
