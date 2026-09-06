import { useQuery } from '@tanstack/react-query';
import { apiGetPlaylist } from '../api';
import { playlistKeys } from './usePlaylists';

export function usePlaylist(id: string, fields?: string) {
  return useQuery({
    queryKey: [...playlistKeys.detail(id), fields],
    queryFn: () => apiGetPlaylist(id, fields),
    staleTime: 60 * 1000,
    retry: 2,
    enabled: !!id,
  });
}
