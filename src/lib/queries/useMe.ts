import { useQuery } from '@tanstack/react-query';
import { apiGetMe } from '../api';

export const meKeys = {
  all: ['me'] as const,
};

export function useMe() {
  return useQuery({
    queryKey: meKeys.all,
    queryFn: apiGetMe,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
