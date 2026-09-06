import { useQuery } from '@tanstack/react-query';
import { apiGetSavedShows, apiGetShow, apiGetShowEpisodes } from '../api';

export const showKeys = {
  saved: (limit?: number, offset?: number) =>
    ['shows', 'saved', limit, offset] as const,
  detail: (id: string) => ['shows', id] as const,
  episodes: (id: string, limit?: number, offset?: number) =>
    ['shows', id, 'episodes', limit, offset] as const,
};

export function useSavedShows(limit = 50, offset = 0) {
  return useQuery({
    queryKey: showKeys.saved(limit, offset),
    queryFn: () => apiGetSavedShows(limit, offset),
    staleTime: 60 * 1000,
    retry: 2,
  });
}

export function useShow(id: string) {
  return useQuery({
    queryKey: showKeys.detail(id),
    queryFn: () => apiGetShow(id),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!id,
  });
}

export function useShowEpisodes(id: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: showKeys.episodes(id, limit, offset),
    queryFn: () => apiGetShowEpisodes(id, limit, offset),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!id,
  });
}
