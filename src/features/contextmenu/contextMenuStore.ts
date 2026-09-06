import { create } from 'zustand';
import type { SpotifyTrack } from '../../lib/types';

/** What kind of entity a context menu was opened for. */
export type MenuTarget =
  | {
      kind: 'track';
      track: SpotifyTrack;
      contextUri?: string;
      queueUris?: string[];
    }
  | { kind: 'playlist'; id: string; name: string; uri: string; image?: string }
  | { kind: 'album'; id: string; name: string; uri: string; image?: string }
  | { kind: 'artist'; id: string; name: string; uri: string };

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  target: MenuTarget | null;
  /** When opened from a button anchor rather than the cursor. */
  anchored: boolean;
  openMenu: (
    x: number,
    y: number,
    target: MenuTarget,
    anchored?: boolean,
  ) => void;
  close: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  open: false,
  x: 0,
  y: 0,
  target: null,
  anchored: false,
  openMenu: (x, y, target, anchored = false) =>
    set({ open: true, x, y, target, anchored }),
  close: () => set({ open: false, target: null }),
}));
