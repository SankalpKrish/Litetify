import { create } from 'zustand';
import type { ModEntry } from './manifest';

export interface ModsStore {
  registry: ModEntry[];
  activeTheme: string | null;
  customViews: Map<
    string,
    { label: string; icon: string; render: () => React.ReactNode }
  >;
  customViewsVersion: number;
  setRegistry: (registry: ModEntry[]) => void;
  toggleEnabled: (path: string) => void;
  setActiveTheme: (name: string | null) => void;
  setCustomViews: (
    views: Map<
      string,
      { label: string; icon: string; render: () => React.ReactNode }
    >,
  ) => void;
  registerCustomView: (
    id: string,
    label: string,
    render: () => React.ReactNode,
    icon?: string,
  ) => void;
  unregisterCustomView: (id: string) => void;
}

export const useModsStore = create<ModsStore>((set) => ({
  registry: [],
  activeTheme: null,
  customViews: new Map(),
  customViewsVersion: 0,

  setRegistry: (registry) => set({ registry }),

  toggleEnabled: (path) =>
    set((state) => {
      const target = state.registry.find((m) => m.path === path);
      if (!target) return state;
      const enabling = !target.enabled;
      if (target.manifest.type === 'theme' && enabling) {
        return {
          registry: state.registry.map((m) => {
            if (m.path === path) return { ...m, enabled: true };
            if (m.manifest.type === 'theme') return { ...m, enabled: false };
            return m;
          }),
        };
      }
      return {
        registry: state.registry.map((m) =>
          m.path === path ? { ...m, enabled: enabling } : m,
        ),
      };
    }),

  setActiveTheme: (name) => set({ activeTheme: name }),

  setCustomViews: (views) => set({ customViews: views }),

  registerCustomView: (id, label, render, icon = '') =>
    set((state) => {
      const next = new Map(state.customViews);
      next.set(id, { label, icon, render });
      return {
        customViews: next,
        customViewsVersion: state.customViewsVersion + 1,
      };
    }),

  unregisterCustomView: (id) =>
    set((state) => {
      const next = new Map(state.customViews);
      next.delete(id);
      return {
        customViews: next,
        customViewsVersion: state.customViewsVersion + 1,
      };
    }),
}));
