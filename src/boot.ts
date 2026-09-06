import { checkAuth } from './features/auth/authStore';
import { config } from './lib/config';
import {
  apiGetPlaylists,
  apiGetRecentlyPlayed,
  apiGetTopArtists,
  apiGetTopTracks,
} from './lib/api';
import { queryClient } from './lib/queries/queryClient';
import { homeKeys } from './lib/queries/useHome';

export type BootAuth = 'authenticated' | 'unauthenticated';

function prefetchHome(): Promise<unknown>[] {
  return [
    queryClient.prefetchQuery({
      queryKey: [...homeKeys.topArtists, 6],
      queryFn: () => apiGetTopArtists(6),
      staleTime: 5 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: [...homeKeys.topTracks, 6],
      queryFn: () => apiGetTopTracks(6),
      staleTime: 5 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: [...homeKeys.recentlyPlayed, 50],
      queryFn: () => apiGetRecentlyPlayed(50),
      staleTime: 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: [...homeKeys.playlists, 6],
      queryFn: () => apiGetPlaylists(6),
      staleTime: 60 * 1000,
    }),
  ];
}

/** Load config, auth, and Home data before the shell mounts. */
export async function prepareApp(): Promise<BootAuth> {
  await config.init();
  const hasTokens = await checkAuth();
  if (!hasTokens) return 'unauthenticated';

  // ponytail: allSettled so one failed fetch does not block the shell
  await Promise.allSettled(prefetchHome());
  return 'authenticated';
}
