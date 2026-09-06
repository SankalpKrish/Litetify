import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { apiGetPlaylistTracks } from '../api';
import { playlistKeys } from './usePlaylists';
import type { PlaylistTracks, PlaylistTrackItem } from '../types';

const PAGE_SIZE = 50;

/**
 * Loads ALL tracks in a playlist by paging through /playlists/{id}/items
 * (Spotify returns at most 50 per request, 100 without paging). Pages are
 * fetched eagerly so the full track list is available for display + playback.
 */
export function usePlaylistTracks(playlistId: string) {
  const query = useInfiniteQuery({
    queryKey: [...playlistKeys.tracks(playlistId), 'all'],
    queryFn: ({ pageParam = 0 }) =>
      apiGetPlaylistTracks(playlistId, PAGE_SIZE, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage: PlaylistTracks) => {
      const loaded = (lastPage.offset ?? 0) + (lastPage.items?.length ?? 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    staleTime: 30 * 1000,
    retry: 2,
    enabled: !!playlistId,
  });

  // Eagerly fetch remaining pages until the whole playlist is loaded.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items: PlaylistTrackItem[] = useMemo(
    () =>
      (query.data?.pages ?? [])
        .flatMap((p) => p.items ?? [])
        .filter((x): x is PlaylistTrackItem => x != null),
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;

  return { ...query, items, total };
}
