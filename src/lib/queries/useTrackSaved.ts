import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiCheckLibrary,
  apiSaveToLibrary,
  apiRemoveFromLibrary,
} from '../api';

export function useTrackSaved(uri: string) {
  const qc = useQueryClient();

  const { data: saved } = useQuery({
    queryKey: ['library', 'check', uri],
    queryFn: () => apiCheckLibrary([uri]),
    enabled: !!uri,
    staleTime: 30 * 1000,
    select: (res) => res[0] ?? false,
  });

  const mutation = useMutation({
    mutationFn: (save: boolean) =>
      save ? apiSaveToLibrary([uri]) : apiRemoveFromLibrary([uri]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library', 'check', uri] });
      qc.invalidateQueries({ queryKey: ['liked'] }); // refresh LikedSongs list
    },
  });

  return {
    isSaved: saved ?? false,
    toggle: () => mutation.mutate(!saved),
    toggling: mutation.isPending,
  };
}
