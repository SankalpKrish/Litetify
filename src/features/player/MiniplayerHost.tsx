import { useEffect, useRef } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { usePlayerStore } from './playerStore';
import type {
  MiniplayerCmd,
  MiniplayerSyncPayload,
} from '../../playback/miniplayerEvents';
import { MINI_CMD, MINI_SYNC } from '../../playback/miniplayerEvents';

const PREV_DOUBLE_PRESS_WINDOW = 3000;

/**
 * Rendered in the main window only. Listens for `miniplayer-cmd` from the
 * mini-player window and dispatches them to the real playback engine.
 * Also broadcasts player state to the mini-player window every 500ms.
 */
export function MiniplayerHost() {
  const getEngine = usePlayerStore((s) => s.getEngine);

  // Spotify-style double-press tracker for "previous" command
  const lastPrevPress = useRef(0);

  useEffect(() => {
    const unlistenPromise = listen(MINI_CMD, (event: { payload: unknown }) => {
      const cmd = event.payload as MiniplayerCmd;
      const engine = getEngine();
      if (!engine) return;

      switch (cmd.action) {
        case 'pause':
          engine.pause().catch(() => {});
          break;
        case 'resume':
          engine.resume().catch(() => {});
          break;
        case 'next':
          engine.nextTrack().catch(() => {});
          break;
        case 'previous': {
          const now = Date.now();
          const pos = usePlayerStore.getState().positionMs;
          if (
            now - lastPrevPress.current < PREV_DOUBLE_PRESS_WINDOW ||
            pos < PREV_DOUBLE_PRESS_WINDOW
          ) {
            engine.previousTrack().catch(() => {});
            lastPrevPress.current = 0;
          } else {
            engine.seek(0).catch(() => {});
            lastPrevPress.current = now;
          }
          break;
        }
        case 'seek':
          engine.seek(cmd.positionMs).catch(() => {});
          break;
        case 'setVolume':
          engine.setVolume(cmd.volume).catch(() => {});
          break;
        case 'toggleShuffle':
          engine.toggleShuffle().catch(() => {});
          break;
        case 'cycleRepeat':
          engine.cycleRepeat().catch(() => {});
          break;
      }
    });

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [getEngine]);

  // Broadcast state every 500ms
  useEffect(() => {
    const id = setInterval(() => {
      const s = usePlayerStore.getState();
      const payload: MiniplayerSyncPayload = {
        uri: s.uri,
        trackId: s.trackId,
        name: s.name,
        artist: s.artist,
        album: s.album,
        albumUri: s.albumUri,
        albumImage: s.albumImage,
        durationMs: s.durationMs,
        positionMs: s.positionMs,
        isPlaying: s.isPlaying,
        volume: s.volume,
        shuffle: s.shuffle,
        repeat: s.repeat,
        deviceId: s.deviceId,
      };
      emit(MINI_SYNC, payload).catch(() => {
        /* mini-player window closed — ignore */
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  return null;
}
