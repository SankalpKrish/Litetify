import { useQuery } from '@tanstack/react-query';
import {
  apiGetTopArtists,
  apiGetTopTracks,
  apiGetRecentlyPlayed,
  apiGetPlaylists,
} from '../api';

export const homeKeys = {
  topArtists: ['home', 'topArtists'] as const,
  topTracks: ['home', 'topTracks'] as const,
  recentlyPlayed: ['home', 'recentlyPlayed'] as const,
  playlists: ['home', 'playlists'] as const,
};

export function useTopArtists(limit = 6) {
  return useQuery({
    queryKey: [...homeKeys.topArtists, limit],
    queryFn: () => apiGetTopArtists(limit),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useTopTracks(limit = 6) {
  return useQuery({
    queryKey: [...homeKeys.topTracks, limit],
    queryFn: () => apiGetTopTracks(limit),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useRecentlyPlayed(limit = 6) {
  return useQuery({
    queryKey: [...homeKeys.recentlyPlayed, limit],
    queryFn: () => apiGetRecentlyPlayed(limit),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useHomePlaylists(limit = 6) {
  return useQuery({
    queryKey: [...homeKeys.playlists, limit],
    queryFn: () => apiGetPlaylists(limit),
    staleTime: 60 * 1000,
    retry: 1,
  });
}
