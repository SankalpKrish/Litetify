import { useQuery } from '@tanstack/react-query';
import { apiGetLikedTracks } from '../api';

export const likedKeys = {
  all: ['liked'] as const,
  list: (limit?: number, offset?: number) => ['liked', limit, offset] as const,
};

export function useLikedTracks(limit?: number, offset?: number) {
  return useQuery({
    queryKey: likedKeys.list(limit, offset),
    queryFn: () => apiGetLikedTracks(limit, offset),
    staleTime: 30 * 1000,
    retry: 2,
  });
}
