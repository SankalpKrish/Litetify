import { create } from 'zustand';

export type ViewMode = 'compact' | 'list';

const STORAGE_KEY = 'litetify:trackViewMode';

function load(): ViewMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'compact' || v === 'list' ? v : 'list';
  } catch {
    return 'list';
  }
}

interface ViewModeState {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

export const useViewModeStore = create<ViewModeState>((set) => ({
  mode: load(),
  setMode: (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* noop */
    }
    set({ mode });
  },
}));
