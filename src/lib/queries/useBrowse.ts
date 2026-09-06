import { useQuery } from '@tanstack/react-query';
import { apiSearch } from '../api';
import { queryClient } from './queryClient';
import type { SpotifyAlbum } from '../types';

export const FALLBACK_GENRES = [
  'pop',
  'rock',
  'electronic',
  'hip-hop',
  'jazz',
  'r&b',
  'latin',
  'indie',
  'folk',
  'country',
  'funk',
  'soul',
  'dance',
  'house',
  'techno',
  'alternative',
  'classical',
];

export function labelOf(genre: string): string {
  return genre.charAt(0).toUpperCase() + genre.slice(1);
}

export interface SectionData {
  label: string;
  items: SpotifyAlbum[];
}

export const browseKeys = {
  discover: ['browse', 'discover'] as const,
  genreSections: ['browse', 'genreSections'] as const,
};

// ── Discover section ──

export function useBrowseDiscover(market?: string) {
  return useQuery({
    queryKey: [...browseKeys.discover, market],
    queryFn: () =>
      apiSearch('new', ['album'], 10, 0, market).then(
        (res) => res.albums?.items ?? ([] as SpotifyAlbum[]),
      ),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Prefetch browse discover data so it's cached when user navigates to the browse tab. */
export function prefetchBrowseDiscover(market?: string) {
  queryClient.prefetchQuery({
    queryKey: [...browseKeys.discover, market],
    queryFn: () =>
      apiSearch('new', ['album'], 10, 0, market).then(
        (res) => res.albums?.items ?? ([] as SpotifyAlbum[]),
      ),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Genre sections ──

/** Read genre sections from the React Query cache (populated by prefetchBrowseGenres). */
export function useBrowseGenreSections(): SectionData[] {
  const { data } = useQuery({
    queryKey: browseKeys.genreSections,
    queryFn: () => [],
    staleTime: Infinity,
    enabled: false,
  });
  return data ?? [];
}

/**
 * Batch-load albums for each genre in the pool and write the result into the
 * React Query cache. Loading is throttled (2 concurrent, 1.5s between batches)
 * to avoid hitting Spotify rate limits.
 */
export async function prefetchBrowseGenres(
  genrePool: string[],
  market?: string,
): Promise<void> {
  const concurrency = 2;
  const results: SectionData[] = [];

  for (let i = 0; i < genrePool.length; i += concurrency) {
    const batch = genrePool.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((g) =>
        apiSearch(g, ['album'], 10, 0, market).then(
          (res) =>
            ({
              label: labelOf(g),
              items: res.albums?.items ?? [],
            }) satisfies SectionData,
        ),
      ),
    );
    results.push(...batchResults);

    // Pause between batches to let rate window breathe
    if (i + concurrency < genrePool.length)
      await new Promise((r) => setTimeout(r, 1500));
  }

  queryClient.setQueryData(browseKeys.genreSections, results);
}
