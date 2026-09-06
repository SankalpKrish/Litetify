import type { RepeatMode } from './engine';

/** Event name for control commands from mini-player → main window */
export const MINI_CMD = 'miniplayer-cmd';

/** Event name for state sync from main window → mini-player */
export const MINI_SYNC = 'miniplayer-sync';

/** Event name for notifying main window that the mini-player is closing */
export const MINI_CLOSE = 'miniplayer-close';

/** Control actions the mini-player can request the main window's engine to execute */
export type MiniplayerCmd =
  | { action: 'pause' }
  | { action: 'resume' }
  | { action: 'next' }
  | { action: 'previous' }
  | { action: 'seek'; positionMs: number }
  | { action: 'setVolume'; volume: number }
  | { action: 'toggleShuffle' }
  | { action: 'cycleRepeat' };

/** State payload broadcast from main window to mini-player */
export interface MiniplayerSyncPayload {
  uri: string | null;
  trackId: string | null;
  name: string | null;
  artist: string | null;
  album: string | null;
  albumUri: string | null;
  albumImage: string | null;
  durationMs: number;
  positionMs: number;
  isPlaying: boolean;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  deviceId: string | null;
}
