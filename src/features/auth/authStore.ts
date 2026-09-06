import { invoke } from '@tauri-apps/api/core';
import { config } from '@/lib/config';

export type AuthStatus =
  'loading' | 'unauthenticated' | 'authenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  error: string | null;
  clientId: string;
}

function loadClientId(): string {
  // Prefer the config cache (Rust-backed); fall back to localStorage for
  // migration of values saved before the config system existed.
  const cached = config.getCached().clientId;
  if (cached) return cached;
  try {
    return localStorage.getItem('litetify:clientId') ?? '';
  } catch {
    return '';
  }
}

function saveClientId(id: string): void {
  try {
    config.update({ clientId: id }).catch(() => {
      // fallback: write to localStorage if config store unavailable
      localStorage.setItem('litetify:clientId', id);
    });
  } catch {
    // config system unavailable
    try {
      localStorage.setItem('litetify:clientId', id);
    } catch {
      /* noop */
    }
  }
}

export function getStoredClientId(): string {
  return loadClientId();
}

export function persistClientId(id: string): void {
  saveClientId(id);
}

export async function checkAuth(): Promise<boolean> {
  try {
    return await invoke<boolean>('check_auth');
  } catch {
    return false;
  }
}

export async function login(
  clientId: string,
  enabledFeatures?: string[],
): Promise<void> {
  await invoke('login', { clientId, enabledFeatures });
  persistClientId(clientId);
}

export async function logout(): Promise<void> {
  try {
    await invoke('logout');
  } finally {
    try {
      config.update({ clientId: null }).catch(() => {
        localStorage.removeItem('litetify:clientId');
      });
    } catch {
      try {
        localStorage.removeItem('litetify:clientId');
      } catch {
        /* noop */
      }
    }
  }
}
