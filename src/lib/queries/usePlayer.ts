import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetCurrentlyPlaying,
  apiGetAvailableDevices,
  apiTransferPlayback,
} from '../api';

export const playerKeys = {
  currentlyPlaying: ['player', 'currentlyPlaying'] as const,
  devices: ['player', 'devices'] as const,
};

export function useCurrentlyPlaying() {
  return useQuery({
    queryKey: playerKeys.currentlyPlaying,
    queryFn: apiGetCurrentlyPlaying,
    refetchInterval: 5000,
    retry: 1,
  });
}

export function useAvailableDevices() {
  return useQuery({
    queryKey: playerKeys.devices,
    queryFn: apiGetAvailableDevices,
    refetchInterval: 10000,
    retry: 1,
  });
}

export function useTransferPlayback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceIds,
      play,
    }: {
      deviceIds: string[];
      play?: boolean;
    }) => apiTransferPlayback(deviceIds, play),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playerKeys.devices });
    },
  });
}
