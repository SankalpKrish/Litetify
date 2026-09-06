/**
 * Playback Timer hook
 * Tracks playback state and updates session stats
 */

import { useEffect, useRef } from 'react';
import { usePlayerStore } from './playerStore';
import { updatePlayTime, trackPlay } from './playbackTimer';

const POLL_INTERVAL_MS = 1000;

export function usePlaybackTimer() {
  const lastTrackUri = useRef<string | null>(null);
  const lastPositionMs = useRef<number>(0);
  const lastUpdateTime = useRef<number>(Date.now());
  const isPlayingRef = useRef(false);

  useEffect(() => {
    // Subscribe to state changes
    const unsub = usePlayerStore.subscribe((state, prevState) => {
      // Handle playing state changes
      if (state.isPlaying !== prevState.isPlaying) {
        isPlayingRef.current = state.isPlaying;
        if (state.isPlaying) {
          lastUpdateTime.current = Date.now();
        }
      }

      // Handle track changes
      const uri = state.uri;
      if (uri && uri !== lastTrackUri.current) {
        lastTrackUri.current = uri;
        lastPositionMs.current = state.positionMs || 0;

        // Track the new play
        if (state.name && state.artist) {
          const artists = state.artist.split(', ').map((a) => a.trim());
          trackPlay(uri, state.name, artists);
        }
      }
    });

    // Poll for play time updates
    const interval = setInterval(() => {
      if (isPlayingRef.current) {
        const now = Date.now();
        const delta = now - lastUpdateTime.current;
        lastUpdateTime.current = now;

        // Only count reasonable deltas (debounce)
        if (delta > 0 && delta < 5000) {
          updatePlayTime(delta);
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);
}
