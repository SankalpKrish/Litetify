import { useQuery } from '@tanstack/react-query';
import { apiSearch } from '../api';
import type { SearchType } from '../types';

export const searchKeys = {
  results: (query: string, types: SearchType[]) =>
    ['search', query, [...types].sort().join(',')] as const,
};

export function useSearch(
  query: string,
  types: SearchType[] = ['track', 'artist', 'album', 'playlist'],
  limit?: number,
  offset?: number,
  market?: string,
) {
  return useQuery({
    queryKey: [...searchKeys.results(query, types), limit, offset, market],
    queryFn: () => apiSearch(query, types, limit, offset, market),
    staleTime: 60 * 1000,
    retry: 1,
    enabled: query.length > 0,
  });
}
