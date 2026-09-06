import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { usePlayerStore } from './playerStore';
import styles from './ProgressBar.module.css';

function fmt(ms: number): string {
  if (!ms || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ProgressBar = memo(function ProgressBar() {
  const durationMs = usePlayerStore((s) => s.durationMs);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const setState = usePlayerStore((s) => s.setState);
  const getEngine = usePlayerStore((s) => s.getEngine);

  // ponytail: rAF progress tick with delta-time
  // pauses store updates while user is scrubbing (seeking via drag)
  const scrubbingRef = useRef(false);
  useEffect(() => {
    if (!isPlaying || durationMs <= 0) return;
    let last = performance.now();
    let id: number;
    const tick = (now: number) => {
      const s = usePlayerStore.getState();
      if (!s.isPlaying) {
        cancelAnimationFrame(id);
        return;
      }
      // pause store updates during scrubbing — only seek() on release moves position
      if (!scrubbingRef.current) {
        const next = Math.min(s.positionMs + (now - last), s.durationMs);
        s.setState({ positionMs: next });
      }
      last = now;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [isPlaying, durationMs]);
  const barRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);
  const rectRef = useRef<DOMRect | null>(null);

  const fraction = durationMs > 0 ? positionMs / durationMs : 0;
  const displayFraction = scrubbing ? scrubPos : fraction;
  const displayPos = scrubbing ? Math.round(scrubPos * durationMs) : positionMs;

  const seek = useCallback(
    async (clientX: number) => {
      const el = barRef.current;
      if (!el || durationMs <= 0) return;
      const rect = rectRef.current ?? el.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const frac = x / rect.width;
      const target = Math.round(frac * durationMs);
      setState({ positionMs: target });
      const engine = getEngine();
      if (engine) {
        try {
          await engine.seek(target);
        } catch (err) {
          console.warn('[litetify] seekbar seek failed:', err);
        }
      } else {
        console.warn('[litetify] seekbar seek: no engine');
      }
    },
    [durationMs, setState, getEngine],
  );

  const onDown = useCallback((e: React.PointerEvent) => {
    // Capture pointer so we keep receiving move/up events even outside the bar
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubbing(true);
    scrubbingRef.current = true;
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rectRef.current = rect;
    setScrubPos(
      Math.max(0, Math.min(e.clientX - rect.left, rect.width)) / rect.width,
    );
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubbing) return;
      const el = barRef.current;
      if (!el) return;
      const rect = rectRef.current ?? el.getBoundingClientRect();
      setScrubPos(
        Math.max(0, Math.min(e.clientX - rect.left, rect.width)) / rect.width,
      );
    },
    [scrubbing],
  );

  const onUp = useCallback(
    (e: React.PointerEvent) => {
      setScrubbing(false);
      scrubbingRef.current = false;
      seek(e.clientX);
    },
    [seek],
  );

  return (
    <div className={styles['progress-area']}>
      <span className={styles['progress-time']}>{fmt(displayPos)}</span>
      <div
        ref={barRef}
        className={styles['progress-bar']}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          setScrubbing(false);
          scrubbingRef.current = false;
        }}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={durationMs}
        aria-valuenow={displayPos}
        tabIndex={0}
        onKeyDown={(e) => {
          if (durationMs <= 0) return;
          const step = durationMs * 0.02;
          let target = positionMs;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            target = Math.min(positionMs + step, durationMs);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            target = Math.max(positionMs - step, 0);
          } else if (e.key === 'Home') {
            e.preventDefault();
            target = 0;
          } else if (e.key === 'End') {
            e.preventDefault();
            target = durationMs;
          } else {
            return;
          }
          setState({ positionMs: target });
          const engine = getEngine();
          if (engine)
            engine
              .seek(target)
              .catch((err) => console.warn('Seek failed:', err));
        }}
      >
        <div
          className={styles['progress-fill']}
          style={{ transform: `scaleX(${displayFraction})` }}
        />
        <div
          className={styles['progress-thumb']}
          style={{ left: `${displayFraction * 100}%` }}
        />
        {scrubbing && (
          <div
            className={styles['progress-tooltip']}
            style={{ left: `${displayFraction * 100}%` }}
          >
            {fmt(displayPos)}
          </div>
        )}
      </div>
      <span className={styles['progress-time']}>{fmt(durationMs)}</span>
    </div>
  );
});
