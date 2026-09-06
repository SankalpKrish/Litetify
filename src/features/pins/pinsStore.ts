import { create } from 'zustand';
import { config } from '@/lib/config';
import { moveItem } from './reorder';

export interface PinnedItem {
  id: string;
  name: string;
  image: string;
  uri: string;
  type: 'playlist' | 'album';
}

function load(): PinnedItem[] {
  // Read from the Rust-backed config store (pins are stored as stringified
  // JSON objects); fall back to localStorage for migration of pre-config data.
  try {
    const raw = config.getCached().pins;
    if (raw && raw.length > 0) {
      const parsed = raw
        .map((s) => {
          try {
            return JSON.parse(s) as PinnedItem;
          } catch {
            return null;
          }
        })
        .filter(
          (p): p is PinnedItem => p !== null && typeof p.uri === 'string',
        );
      if (parsed.length > 0) return parsed;
    }
  } catch {
    /* config not available — try localStorage */
  }
  try {
    const raw = localStorage.getItem('litetify:pins');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(pins: PinnedItem[]): void {
  // Store as stringified JSON objects in the string[] config field so the
  // full PinnedItem data survives the Rust store round-trip.
  const serialized = pins.map((p) => JSON.stringify(p));
  try {
    config.update({ pins: serialized }).catch(() => {
      try {
        localStorage.setItem('litetify:pins', JSON.stringify(pins));
      } catch {
        /* noop */
      }
    });
  } catch {
    try {
      localStorage.setItem('litetify:pins', JSON.stringify(pins));
    } catch {
      /* noop */
    }
  }
}

interface PinsState {
  pins: PinnedItem[];
  isPinned: (uri: string) => boolean;
  pin: (item: PinnedItem) => void;
  unpin: (uri: string) => void;
  togglePin: (item: PinnedItem) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
}

export const usePinsStore = create<PinsState>((set, get) => ({
  pins: load(),
  isPinned: (uri) => get().pins.some((p) => p.uri === uri),
  pin: (item) => {
    if (get().pins.some((p) => p.uri === item.uri)) return;
    const next = [...get().pins, item];
    save(next);
    set({ pins: next });
  },
  unpin: (uri) => {
    const next = get().pins.filter((p) => p.uri !== uri);
    save(next);
    set({ pins: next });
  },
  togglePin: (item) => {
    const state = get();
    if (state.isPinned(item.uri)) {
      state.unpin(item.uri);
    } else {
      state.pin(item);
    }
  },
  reorder: (fromIndex, toIndex) => {
    const current = get().pins;
    const next = moveItem(current, fromIndex, toIndex);
    if (next === current) return;
    save(next);
    set({ pins: next });
  },
}));
