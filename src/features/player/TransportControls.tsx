import { memo, useCallback, useRef } from 'react';
import { usePlayerStore } from './playerStore';
import styles from './TransportControls.module.css';
import {
  ShuffleIcon,
  SkipIcon,
  PlayIcon,
  PauseIcon,
  RepeatIcon,
} from '../../components/icons';

const PREV_DOUBLE_PRESS_WINDOW = 3000;

function useEngine() {
  return usePlayerStore((s) => s.getEngine)();
}

export const TransportControls = memo(function TransportControls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const engine = useEngine();
  // Tracks the time of the last "previous" press so a second press within the
  // window skips to the previous track instead of restarting the current one.
  const lastPrevPress = useRef(0);

  const togglePlay = useCallback(() => {
    if (!engine) return;
    if (isPlaying) {
      engine.pause().catch(() => {});
    } else {
      engine.resume().catch(() => {});
    }
  }, [isPlaying, engine]);

  const act = useCallback(
    (fn: () => Promise<void>) => {
      if (engine) fn().catch(() => {});
    },
    [engine],
  );

  // Spotify-style previous: restart the current track; press again within 3s to
  // jump to the actual previous track.
  const handlePrevious = useCallback(() => {
    if (!engine) return;
    const now = Date.now();
    const withinWindow = now - lastPrevPress.current < PREV_DOUBLE_PRESS_WINDOW;
    const positionMs = usePlayerStore.getState().positionMs;
    if (withinWindow || positionMs < PREV_DOUBLE_PRESS_WINDOW) {
      engine.previousTrack().catch(() => {});
      lastPrevPress.current = 0; // consume the window
    } else {
      engine.seek(0).catch(() => {});
      lastPrevPress.current = now;
    }
  }, [engine]);

  return (
    <div className={styles['transport-controls']}>
      <button
        className={`ctrl-btn ${shuffle ? 'ctrl-active' : ''}`}
        onClick={() => act(() => engine!.toggleShuffle())}
        title="Shuffle"
        aria-label="Toggle shuffle"
      >
        <ShuffleIcon />
      </button>
      <button
        className="ctrl-btn"
        onClick={handlePrevious}
        title="Previous"
        aria-label="Previous track"
      >
        <SkipIcon direction="prev" />
      </button>
      <button
        className="ctrl-btn ctrl-play"
        onClick={togglePlay}
        title={isPlaying ? 'Pause' : 'Play'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        className="ctrl-btn"
        onClick={() => act(() => engine!.nextTrack())}
        title="Next"
        aria-label="Next track"
      >
        <SkipIcon direction="next" />
      </button>
      <button
        className={`ctrl-btn ${repeat !== 'off' ? 'ctrl-active' : ''}`}
        onClick={() => act(() => engine!.cycleRepeat())}
        title={`Repeat: ${repeat}`}
        aria-label="Cycle repeat mode"
      >
        <RepeatIcon />
        {repeat === 'track' && <span className="repeat-indicator">1</span>}
      </button>
    </div>
  );
});
