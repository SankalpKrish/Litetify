/** Crossfade settings — persisted to localStorage */

const CF_KEY = 'litetify:crossfadeEnabled';
const CD_KEY = 'litetify:crossfadeDuration';

export function getCrossfadeEnabled(): boolean {
  try {
    return localStorage.getItem(CF_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setCrossfadeEnabled(v: boolean): void {
  try {
    localStorage.setItem(CF_KEY, v ? 'true' : 'false');
  } catch {
    /* noop */
  }
}

export function getCrossfadeDuration(): number {
  try {
    const v = parseInt(localStorage.getItem(CD_KEY) || '', 10);
    if (!isNaN(v) && v >= 0 && v <= 12) return v;
  } catch {
    /* noop */
  }
  return 6; // default 6s
}

export function setCrossfadeDuration(s: number): void {
  try {
    localStorage.setItem(CD_KEY, String(s));
  } catch {
    /* noop */
  }
}

export function getGaplessEnabled(): boolean {
  try {
    return localStorage.getItem('litetify:gaplessEnabled') !== 'false';
  } catch {
    return true;
  }
}

export function setGaplessEnabled(v: boolean): void {
  try {
    localStorage.setItem('litetify:gaplessEnabled', v ? 'true' : 'false');
  } catch {
    /* noop */
  }
}
