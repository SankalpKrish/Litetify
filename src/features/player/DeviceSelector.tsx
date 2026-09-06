import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { apiGetAvailableDevices, apiTransferPlayback } from '../../lib/api';
import styles from './DeviceSelector.module.css';

interface DeviceInfo {
  id: string;
  name: string;
  is_active: boolean;
  volume_percent: number | null;
}

const MENU_WIDTH = 220;

export function DeviceSelector() {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [pos, setPos] = useState<{ left: number; bottom: number }>({
    left: 0,
    bottom: 0,
  });

  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    apiGetAvailableDevices()
      .then((devices) => setDevices(devices as DeviceInfo[]))
      .catch((err) => console.warn('Failed to fetch devices:', err));
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  // Position the portaled menu above the trigger, right-aligned to it and
  // clamped into the viewport so it never gets clipped by the player bar.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const margin = 8;
    let left = r.right - MENU_WIDTH;
    if (left < margin) left = margin;
    if (left + MENU_WIDTH > window.innerWidth - margin) {
      left = window.innerWidth - margin - MENU_WIDTH;
    }
    setPos({ left, bottom: window.innerHeight - r.top + 8 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        btnRef.current &&
        !btnRef.current.contains(t) &&
        menuRef.current &&
        !menuRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', () => setOpen(false));
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const transfer = useCallback(async (deviceId: string) => {
    try {
      await apiTransferPlayback([deviceId], true);
      setOpen(false);
    } catch (err) {
      console.warn('Device transfer failed:', err);
    }
  }, []);

  return (
    <div className={styles['device-selector']}>
      <button
        ref={btnRef}
        className="ctrl-btn"
        onClick={() => setOpen(!open)}
        aria-label="Connect to a device"
        aria-expanded={open}
        aria-haspopup="true"
        title="Connect to a device"
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
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={styles['device-dropdown']}
            style={{ left: pos.left, bottom: pos.bottom, width: MENU_WIDTH }}
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          >
            <div className={styles['device-dropdown-header']}>
              Connect to device
            </div>
            {devices.length === 0 && (
              <div className={styles['device-empty']}>No devices found</div>
            )}
            {devices.map((d) => (
              <button
                key={d.id}
                className={`${styles['device-item']} ${d.is_active ? styles['device-active'] : ''}`}
                onClick={() => transfer(d.id)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span className={styles['device-item-name']}>{d.name}</span>
                {d.is_active && (
                  <span className={styles['device-badge']}>Active</span>
                )}
              </button>
            ))}
            <button className={styles['device-refresh']} onClick={refresh}>
              Refresh
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
