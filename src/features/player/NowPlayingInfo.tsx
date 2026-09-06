import { memo, useRef, useEffect, useState } from 'react';
import { usePlayerStore } from './playerStore';
import styles from './NowPlayingInfo.module.css';

/**
 * CrossfadeText — smoothly fades between old and new text values.
 * Uses a container with grid stacking so the wrapper always has the height
 * of whichever text is larger, preventing layout shifts.
 */
function CrossfadeText({
  value,
  className,
  title,
  duration = 200,
}: {
  value: string | null;
  className?: string;
  title?: string;
  duration?: number;
}) {
  const [prev, setPrev] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const valueRef = useRef(value);

  useEffect(() => {
    if (value !== valueRef.current) {
      setPrev(valueRef.current);
      valueRef.current = value;
      setFading(true);
      const t = setTimeout(() => {
        setFading(false);
        setPrev(null);
      }, duration + 80);
      return () => clearTimeout(t);
    }
  }, [value, duration]);

  const stack: React.CSSProperties = {
    display: 'grid',
    gridTemplateAreas: '"stack"',
  };
  const cell: React.CSSProperties = {
    gridArea: 'stack',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
  const prevCell: React.CSSProperties = {
    ...cell,
    transition: `opacity ${duration}ms ease`,
    opacity: fading ? 0 : 1,
  };
  const curCell: React.CSSProperties = {
    ...cell,
    opacity: fading ? 1 : 1,
  };

  return (
    <span style={stack} className={className} title={title}>
      {prev !== null && (
        <span className={className} style={prevCell} aria-hidden>
          {prev}
        </span>
      )}
      <span className={className} style={curCell}>
        {value ?? ''}
      </span>
    </span>
  );
}

function NowPlayingInfoInner() {
  const name = usePlayerStore((s) => s.name);
  const artist = usePlayerStore((s) => s.artist);
  const albumImage = usePlayerStore((s) => s.albumImage);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const goNowPlaying = () => {
    window.dispatchEvent(
      new CustomEvent('litetify:navigate', { detail: 'now-playing' }),
    );
  };

  if (!name) {
    return (
      <div
        className={styles['np-info'] + ' ' + styles['np-empty']}
        onClick={goNowPlaying}
      >
        <div className={styles['np-art']} />
        <div className={styles['np-text']}>
          <span className={styles['np-name'] + ' ' + styles['np-placeholder']}>
            No track playing
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        styles['np-info'] + (isPlaying ? '' : ' ' + styles['np-paused'])
      }
      onClick={goNowPlaying}
    >
      <img src={albumImage ?? undefined} alt="" className={styles['np-art']} />
      <div className={styles['np-text']}>
        <CrossfadeText
          className={styles['np-name']}
          value={name}
          title={name}
        />
        <CrossfadeText
          className={styles['np-artist']}
          value={artist}
          title={artist ?? ''}
        />
      </div>
    </div>
  );
}

export const NowPlayingInfo = memo(NowPlayingInfoInner);
