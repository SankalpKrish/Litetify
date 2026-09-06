/**
 * Auto-Queue settings persistence
 */

const STORAGE_PREFIX = 'litetify:autoQueue:';

export type SeedStrategy = 'current' | 'mix';

export interface AutoQueueSettings {
  enabled: boolean;
  seedStrategy: SeedStrategy;
}

const DEFAULTS: AutoQueueSettings = {
  enabled: true,
  seedStrategy: 'current',
};

function getKey(key: string): string {
  return STORAGE_PREFIX + key;
}

function loadSetting<T>(key: string, defaultValue: T): T {
  try {
    const value = localStorage.getItem(getKey(key));
    if (value === null) return defaultValue;
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

function saveSetting<T>(key: string, value: T): void {
  try {
    localStorage.setItem(getKey(key), JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

export function getAutoQueueEnabled(): boolean {
  return loadSetting('enabled', DEFAULTS.enabled);
}

export function setAutoQueueEnabled(enabled: boolean): void {
  saveSetting('enabled', enabled);
}

export function getAutoQueueSeedStrategy(): SeedStrategy {
  return loadSetting('seedStrategy', DEFAULTS.seedStrategy);
}

export function setAutoQueueSeedStrategy(strategy: SeedStrategy): void {
  saveSetting('seedStrategy', strategy);
}
