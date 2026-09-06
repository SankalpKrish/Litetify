import { create } from 'zustand';
import type {
  PlaybackState,
  PlaybackEngine,
  PlayContext,
} from '../../playback/engine';
import { config } from '@/lib/config';

export type EngineType = 'websdk' | 'librespot';

function loadEngineType(): EngineType {
  // Prefer the config cache (Rust-backed); fall back to localStorage for
  // migration of values saved before the config system existed.
  const cached = config.getCached().engineType;
  if (cached === 'librespot' || cached === 'websdk') return cached;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('litetify:engineType');
    if (stored === 'librespot' || stored === 'websdk') return stored;
  }
  return 'websdk';
}

function saveEngineType(t: EngineType): void {
  try {
    config.update({ engineType: t }).catch(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('litetify:engineType', t);
      }
    });
  } catch {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('litetify:engineType', t);
    }
  }
}

const initialState = {
  uri: null as string | null,
  trackId: null as string | null,
  name: null as string | null,
  artist: null as string | null,
  album: null as string | null,
  albumUri: null as string | null,
  albumImage: null as string | null,
  durationMs: 0,
  positionMs: 0,
  isPlaying: false,
  volume: 50,
  shuffle: false,
  repeat: 'off' as 'off' | 'context' | 'track',
  deviceId: null as string | null,
  engine: null as PlaybackEngine | null,
  engineType: loadEngineType() as EngineType,
};

export interface PlayerStore extends PlaybackState {
  engine: PlaybackEngine | null;
  engineType: EngineType;
  setState: (partial: Partial<PlaybackState>) => void;
  reset: () => void;
  setEngine: (engine: PlaybackEngine) => void;
  setEngineType: (t: EngineType) => void;
  getEngineType: () => EngineType;
  getEngine: () => PlaybackEngine | null;
  playTrack: (uri: string, context?: PlayContext) => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  ...initialState,
  setState: (partial) => set(partial),
  reset: () => set(initialState),
  setEngine: (engine) => {
    const type: EngineType =
      engine.name() === 'librespot' ? 'librespot' : 'websdk';
    saveEngineType(type);
    set({ engine, engineType: type });
  },
  setEngineType: (t) => {
    saveEngineType(t);
    set({ engineType: t });
  },
  getEngineType: () => get().engineType,
  getEngine: () => get().engine,
  playTrack: async (uri: string, context?: PlayContext) => {
    const eng = get().engine;
    if (eng) {
      await eng.play(uri, context);
    }
  },
}));
