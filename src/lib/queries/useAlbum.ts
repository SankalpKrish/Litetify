import { useQuery } from '@tanstack/react-query';
import { apiGetAlbum } from '../api';

export const albumKeys = {
  detail: (id: string) => ['album', id] as const,
};

export function useAlbum(id: string) {
  return useQuery({
    queryKey: albumKeys.detail(id),
    queryFn: () => apiGetAlbum(id),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!id,
  });
}
