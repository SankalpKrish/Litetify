/**
 * Auto-Queue hook
 * Detects track changes and adds recommendations when queue is empty
 *
 * NOTE: Spotify doesn't expose queue state via API, so we can't truly detect
 * when the queue is empty. Instead, we add a recommendation after every track
 * change (with debounce and minimum play time). This means:
 * - Works correctly when queue runs out naturally
 * - May add unnecessary recommendations when user manually skips
 * - Minimum play time threshold (30s) helps reduce false positives
 */

import { useEffect, useRef } from 'react';
import { usePlayerStore } from './playerStore';
import { apiGetRecommendations, apiAddToQueue } from '../../lib/api';
import { getAutoQueueEnabled, getAutoQueueSeedStrategy } from './autoQueue';

const DEBOUNCE_MS = 2000;
const MIN_PLAY_TIME_MS = 30000; // Don't auto-queue if previous track played < 30s (user skipped)

export function useAutoQueue() {
  const lastTrackUri = useRef<string | null>(null);
  const lastFetchTime = useRef<number>(0);
  const isFetching = useRef(false);

  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe((state) => {
      const uri = state.uri;

      // No track playing
      if (!uri) return;

      // Track didn't change
      if (uri === lastTrackUri.current) return;

      // Track changed - a new track started
      const previousUri = lastTrackUri.current;
      lastTrackUri.current = uri;

      // Skip if this is the first track (no previous)
      if (!previousUri) return;

      // Check if auto-queue is enabled
      if (!getAutoQueueEnabled()) return;

      // Debounce - don't fetch too frequently
      const now = Date.now();
      if (now - lastFetchTime.current < DEBOUNCE_MS) return;

      // Check if we're already fetching
      if (isFetching.current) return;

      // Only auto-queue if previous track was played for at least 30 seconds
      // This prevents auto-queue when user manually skips tracks
      const timeSinceLastFetch = now - lastFetchTime.current;
      if (previousUri && timeSinceLastFetch < MIN_PLAY_TIME_MS) {
        return;
      }

      // Fetch and add recommendation
      fetchAndQueueRecommendation(uri);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAndQueueRecommendation(currentUri: string) {
    isFetching.current = true;
    lastFetchTime.current = Date.now();

    try {
      // Extract track ID from URI (spotify:track:xxx)
      const trackId = currentUri.split(':').pop();
      if (!trackId) return;

      const strategy = getAutoQueueSeedStrategy();
      const seedTracks = trackId;
      const seedArtists = '';

      // For 'mix' strategy, also use top tracks for variety
      if (strategy === 'mix') {
        // The recommendations API handles mixing well
        // We'll just use current track as primary seed
      }

      // Fetch recommendation
      const response = await apiGetRecommendations(
        seedArtists,
        seedTracks,
        '',
        1,
      );

      if (response.tracks && response.tracks.length > 0) {
        const recommendedTrack = response.tracks[0];

        // Don't queue the same track
        if (recommendedTrack.uri === currentUri) {
          // Try again with no seeds to get a random track
          const fallback = await apiGetRecommendations(
            undefined,
            undefined,
            undefined,
            1,
          );
          if (fallback.tracks && fallback.tracks.length > 0) {
            await addToQueue(fallback.tracks[0].uri!);
          }
        } else {
          await addToQueue(recommendedTrack.uri!);
        }
      }
    } catch (err) {
      console.error('[AutoQueue] Failed to fetch recommendation:', err);
    } finally {
      isFetching.current = false;
    }
  }

  async function addToQueue(uri: string) {
    try {
      // Get current device ID from player store
      const { deviceId } = usePlayerStore.getState();
      if (!deviceId) {
        console.warn('[AutoQueue] No device ID available');
        return;
      }

      await apiAddToQueue(uri, deviceId);
    } catch (err) {
      console.error('[AutoQueue] Failed to add to queue:', err);
    }
  }
}
