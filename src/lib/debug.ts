/**
 * Lightweight logger for Litetify.
 *
 * Prefixes all output with `[litetify]` for easy filtering in DevTools.
 * In production builds the logger can be silenced by setting
 * `localStorage.setItem('litetify:debug', '0')` or via the
 * `LITETIFY_DEBUG=0` environment variable (Rust side).
 *
 * Error and warn calls are always visible — only info/debug can be muted.
 */

const PREFIX = '[litetify]';

const isDebugEnabled = (): boolean => {
  try {
    return localStorage.getItem('litetify:debug') !== '0';
  } catch {
    return true;
  }
};

export interface Logger {
  (...args: unknown[]): void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

function createLogger(namespace: string): Logger {
  const tag = `${PREFIX}[${namespace}]`;

  const logger = function (...args: unknown[]) {
    if (!isDebugEnabled()) return;
    console.log(tag, ...args);
  } as Logger;

  logger.info = function (...args: unknown[]) {
    if (!isDebugEnabled()) return;
    console.log(tag, ...args);
  };

  logger.warn = function (...args: unknown[]) {
    console.warn(tag, ...args);
  };

  logger.error = function (...args: unknown[]) {
    console.error(tag, ...args);
  };

  logger.debug = function (...args: unknown[]) {
    if (!isDebugEnabled()) return;
    console.debug(tag, ...args);
  };

  return logger;
}

export const log = {
  sdk: createLogger('sdk'),
  init: createLogger('init'),
  mods: createLogger('mods'),
  api: createLogger('api'),
  player: createLogger('player'),
  librespot: createLogger('librespot'),
};
