import { useState, useCallback, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { MINI_CLOSE } from '../../playback/miniplayerEvents';

let miniWindow: WebviewWindow | null = null;

export function MiniPlayerToggle() {
  const [open, setOpen] = useState(false);

  // Listen for MiniPlayer close signal to reset toggle state
  useEffect(() => {
    let cancelled = false;
    const unlisten = listen<unknown>(MINI_CLOSE, () => {
      if (!cancelled) {
        miniWindow = null;
        setOpen(false);
      }
    });
    return () => {
      cancelled = true;
      unlisten.then((fn) => fn());
    };
  }, []);

  const toggle = useCallback(async () => {
    if (miniWindow) {
      try {
        await miniWindow.close();
      } catch {
        /* noop */
      }
      miniWindow = null;
      setOpen(false);
      return;
    }

    try {
      const w = new WebviewWindow('mini-player', {
        url: '/?mini=1',
        title: 'Litetify Mini',
        width: 320,
        height: 480,
        minWidth: 280,
        minHeight: 360,
        alwaysOnTop: true,
        decorations: false,
        resizable: true,
        center: true,
      });

      w.once('tauri://created', () => {
        miniWindow = w;
        setOpen(true);
      });

      w.once('tauri://error', (e) => {
        console.error('[MiniPlayer] creation error:', e);
        miniWindow = null;
        setOpen(false);
      });
    } catch (err) {
      console.error('[MiniPlayer] failed to create window:', err);
      setOpen(false);
    }
  }, []);

  return (
    <button
      className={`ctrl-btn ctrl-icon-btn${open ? ' ctrl-active' : ''}`}
      onClick={toggle}
      title={open ? 'Close mini-player' : 'Open mini-player'}
      aria-label="Mini-player"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    </button>
  );
}
