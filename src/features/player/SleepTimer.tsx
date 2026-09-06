import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayerStore } from './playerStore';

type SleepDuration = 15 | 30 | 60 | null;

interface SleepTimerOption {
  label: string;
  value: SleepDuration;
}

const options: SleepTimerOption[] = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '60m', value: 60 },
  { label: 'Off', value: null },
];

export function SleepTimer() {
  const [duration, setDuration] = useState<SleepDuration>(null);
  const [remaining, setRemaining] = useState(0);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef(0);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setDuration(null);
    setRemaining(0);
  }, []);

  const start = useCallback(
    (d: SleepDuration) => {
      if (d === null) {
        clear();
        return;
      }
      setDuration(d);
      endRef.current = Date.now() + d * 60 * 1000;
    },
    [clear],
  );

  useEffect(() => {
    if (!duration) return;
    const tick = () => {
      const left = Math.max(0, endRef.current - Date.now());
      setRemaining(left);
      if (left <= 0) {
        usePlayerStore.getState().engine?.pause();
        clear();
        return;
      }
      timerRef.current = setTimeout(tick, 1000);
    };
    tick();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, clear]);

  return (
    <div className={`sleep-timer${duration ? ' sleep-timer--active' : ''}`}>
      <button
        className="ctrl-btn ctrl-icon-btn"
        onClick={() => setOpen(!open)}
        title={
          duration
            ? `${Math.ceil(remaining / 60000)}m remaining`
            : 'Sleep timer'
        }
        aria-label="Sleep timer"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>
      {open && (
        <>
          <div
            className="sleep-timer-backdrop"
            onClick={() => setOpen(false)}
          />
          <div className="sleep-timer-menu">
            {options.map((o) => (
              <button
                key={o.label}
                className={`sleep-timer-opt${duration === o.value ? ' sleep-timer-opt--sel' : ''}`}
                onClick={() => {
                  start(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
