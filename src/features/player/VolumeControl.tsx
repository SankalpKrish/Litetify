import { memo, useCallback, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { usePlayerStore } from './playerStore';
import styles from './VolumeControl.module.css';

const SpeakerIcon = memo(function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {muted ? (
        <line x1="23" y1="9" x2="17" y2="15" />
      ) : (
        <>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </>
      )}
    </svg>
  );
});

export const VolumeControl = memo(function VolumeControl({
  style,
}: {
  style?: CSSProperties;
}) {
  const volume = usePlayerStore((s) => s.volume);
  const setState = usePlayerStore((s) => s.setState);
  const getEngine = usePlayerStore((s) => s.getEngine);
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const rectRef = useRef<DOMRect | null>(null);
  const prevVolumeRef = useRef(50);

  const engine = getEngine();

  const handleMute = useCallback(() => {
    if (!engine) return;
    if (volume === 0) {
      setState({ volume: prevVolumeRef.current });
      engine.setVolume(prevVolumeRef.current);
    } else {
      prevVolumeRef.current = volume;
      setState({ volume: 0 });
      engine.setVolume(0);
    }
  }, [volume, setState, engine]);

  const setVol = useCallback(
    async (clientX: number) => {
      const el = barRef.current;
      if (!el || !engine) return;
      const rect = rectRef.current ?? el.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const vol = Math.round((x / rect.width) * 100);
      setState({ volume: vol });
      await engine.setVolume(vol);
    },
    [setState, engine],
  );

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      rectRef.current = barRef.current?.getBoundingClientRect() ?? null;
      setVol(e.clientX);
    },
    [setVol],
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setVol(e.clientX);
    },
    [dragging, setVol],
  );

  const onUp = useCallback(
    (e: React.PointerEvent) => {
      setDragging(false);
      setVol(e.clientX);
    },
    [setVol],
  );

  return (
    <div className={styles['volume-control']} style={style}>
      <button
        className="ctrl-btn ctrl-icon-btn"
        onClick={handleMute}
        aria-label={volume === 0 ? 'Unmute' : 'Mute'}
        title={volume === 0 ? 'Unmute' : 'Mute'}
      >
        <SpeakerIcon muted={volume === 0} />
      </button>
      <div
        ref={barRef}
        className={styles['volume-bar']}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => dragging && setDragging(false)}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={volume}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!engine) return;
          let newVol = volume;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            newVol = Math.min(volume + 5, 100);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            newVol = Math.max(volume - 5, 0);
          } else if (e.key === 'Home') {
            e.preventDefault();
            newVol = 0;
          } else if (e.key === 'End') {
            e.preventDefault();
            newVol = 100;
          } else {
            return;
          }
          setState({ volume: newVol });
          engine.setVolume(newVol);
        }}
      >
        <div
          className={styles['volume-fill']}
          style={{ transform: `scaleX(${volume / 100})` }}
        />
      </div>
    </div>
  );
});
