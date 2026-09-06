import { vi } from 'vitest';

export const invoke = vi.fn();

// Mock other Tauri imports that tests might encounter
export const convertFileSrc = vi.fn(
  (path: string) => `https://asset.local/${path}`,
);
