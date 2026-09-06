import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMe } from '../useMe';
import { createWrapper } from './test-utils';
import { apiGetMe } from '../../api';

vi.mock('../../api', () => ({
  apiGetMe: vi.fn(),
}));

const mockUserProfile = {
  id: 'user1',
  display_name: 'Test User',
  email: 'test@example.com',
  product: 'premium',
  country: 'US',
  images: [{ url: 'https://example.com/avatar.jpg', height: 300, width: 300 }],
  followers: { total: 100 },
};

describe('useMe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useMe(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches user profile', async () => {
    vi.mocked(apiGetMe).mockResolvedValue(mockUserProfile);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockUserProfile);
    expect(result.current.data?.display_name).toBe('Test User');
    expect(apiGetMe).toHaveBeenCalled();
  });

  it('returns error state on API failure', { timeout: 15000 }, async () => {
    vi.mocked(apiGetMe).mockRejectedValue(new Error('Auth error'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 10000 },
    );

    expect(result.current.error).toBeDefined();
  });
});
