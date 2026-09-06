import { useQuery } from '@tanstack/react-query';
import { apiGetPlaylists } from '../api';

export const playlistKeys = {
  all: ['playlists'] as const,
  list: (limit?: number, offset?: number) =>
    ['playlists', 'list', limit, offset] as const,
  detail: (id: string) => ['playlists', id] as const,
  tracks: (id: string) => ['playlists', id, 'tracks'] as const,
};

export function usePlaylists(limit?: number, offset?: number) {
  return useQuery({
    queryKey: playlistKeys.list(limit, offset),
    queryFn: () => apiGetPlaylists(limit, offset),
    staleTime: 60 * 1000,
    retry: 2,
  });
}
