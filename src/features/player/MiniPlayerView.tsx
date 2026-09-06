import { useEffect, useCallback, useRef, useState, memo } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { usePlayerStore } from './playerStore';
import { ProgressBar } from './ProgressBar';
import {
  MINI_CMD,
  MINI_SYNC,
  MINI_CLOSE,
} from '../../playback/miniplayerEvents';
import type {
  MiniplayerCmd,
  MiniplayerSyncPayload,
} from '../../playback/miniplayerEvents';
import styles from './MiniPlayerView.module.css';
import {
  ShuffleIcon,
  SkipIcon,
  PlayIcon,
  PauseIcon,
  RepeatIcon,
  CloseIcon,
  SpeakerIcon,
} from '../../components/icons';

// ── Inline style constants (matching NowPlayingView's approach, compact) ──

const S: Record<string, React.CSSProperties> = {
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    paddingTop: 16,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 300,
  },
  art: {
    width: 160,
    height: 160,
    borderRadius: 8,
    objectFit: 'cover',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    background: 'var(--lt-bg-elevated, #1a1a1a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  artFallback: {
    width: 160,
    height: 160,
    borderRadius: 8,
    background: 'var(--lt-bg-elevated, #1a1a1a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'var(--lt-fg-tertiary, #535353)',
  },
  info: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    width: '100%',
  },
  trackName: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--lt-fg-primary, #fff)',
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  artist: {
    fontSize: '0.8rem',
    color: 'var(--lt-fg-secondary, #b3b3b3)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  progressSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 'var(--lt-radius-full, 50%)',
    background: 'var(--lt-fg-primary, #fff)',
    border: 'none',
    color: 'var(--lt-bg-base, #080808)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.1s, opacity 0.15s',
  },
  volumeSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingRight: 26,
    boxSizing: 'border-box',
  },
  volumeBar: {
    width: 160,
    flex: 'none',
    height: 4,
    borderRadius: 2,
    background: 'var(--lt-bg-elevated, #282828)',
    position: 'relative',
    cursor: 'pointer',
    touchAction: 'none',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 2,
    background: 'var(--lt-fg-primary, #fff)',
    transformOrigin: 'left center',
  },
};

// ── Icons (shared, imported from components/icons) ──────────────────────────

// ── Component ───────────────────────────────────────────────────────────────

function VolumeSlider() {
  const volume = usePlayerStore((s) => s.volume);
  const engine = usePlayerStore((s) => s.engine);
  const setState = usePlayerStore((s) => s.setState);
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const rectRef = useRef<DOMRect | null>(null);

  const setVol = useCallback(
    async (clientX: number) => {
      const el = barRef.current;
      if (!el) return;
      const rect = rectRef.current ?? el.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const vol = Math.round((x / rect.width) * 100);
      setState({ volume: vol });
      if (engine) {
        await engine.setVolume(vol);
      } else {
        emit(MINI_CMD, {
          action: 'setVolume',
          volume: vol,
        } satisfies MiniplayerCmd).catch(() => {});
      }
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

  const handleMute = useCallback(() => {
    if (volume === 0) {
      setState({ volume: 50 });
      if (engine) engine.setVolume(50).catch(() => {});
      else
        emit(MINI_CMD, {
          action: 'setVolume',
          volume: 50,
        } satisfies MiniplayerCmd).catch(() => {});
    } else {
      setState({ volume: 0 });
      if (engine) engine.setVolume(0).catch(() => {});
      else
        emit(MINI_CMD, {
          action: 'setVolume',
          volume: 0,
        } satisfies MiniplayerCmd).catch(() => {});
    }
  }, [volume, setState, engine]);

  return (
    <div style={S.volumeSection}>
      <button
        className="ctrl-btn"
        onClick={handleMute}
        aria-label={volume === 0 ? 'Unmute' : 'Mute'}
        title={volume === 0 ? 'Unmute' : 'Mute'}
      >
        <SpeakerIcon muted={volume === 0} />
      </button>
      <div
        ref={barRef}
        style={S.volumeBar}
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
      >
        <div
          style={{ ...S.volumeFill, transform: `scaleX(${volume / 100})` }}
        />
      </div>
    </div>
  );
}

// ── MiniPlayerView ──────────────────────────────────────────────────────────

export const MiniPlayerView = memo(function MiniPlayerView() {
  const name = usePlayerStore((s) => s.name);
  const artist = usePlayerStore((s) => s.artist);
  const albumImage = usePlayerStore((s) => s.albumImage);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const engine = usePlayerStore((s) => s.engine);

  // ── Receive state sync from main window ──
  // We do NOT overwrite positionMs during active playback — ProgressBar's own
  // rAF ticker advances it smoothly every frame. Overwriting every 500ms from
  // the sync event causes visible stutter (the position jumps backwards).
  useEffect(() => {
    const unlistenPromise = listen(MINI_SYNC, (event: { payload: unknown }) => {
      const pl = event.payload as MiniplayerSyncPayload;
      const current = usePlayerStore.getState();
      const changedTrack = pl.uri && pl.uri !== current.uri;
      current.setState({
        // Only set positionMs on track change or when paused (rAF stops)
        positionMs:
          changedTrack || !pl.isPlaying ? pl.positionMs : current.positionMs,
        uri: pl.uri,
        trackId: pl.trackId,
        name: pl.name,
        artist: pl.artist,
        album: pl.album,
        albumUri: pl.albumUri,
        albumImage: pl.albumImage,
        durationMs: pl.durationMs,
        isPlaying: pl.isPlaying,
        volume: pl.volume,
        shuffle: pl.shuffle,
        repeat: pl.repeat,
        deviceId: pl.deviceId,
      });
    });
    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  // ── Emit control commands ──
  const cmd = useCallback(
    (action: MiniplayerCmd) => emit(MINI_CMD, action).catch(() => {}),
    [],
  );

  const playPause = useCallback(() => {
    if (engine) {
      if (isPlaying) engine.pause().catch(() => {});
      else engine.resume().catch(() => {});
      return;
    }
    if (isPlaying) cmd({ action: 'pause' });
    else cmd({ action: 'resume' });
  }, [engine, isPlaying, cmd]);

  const act = useCallback(
    (action: MiniplayerCmd) => {
      if (!engine) {
        cmd(action);
        return;
      }
      switch (action.action) {
        case 'previous':
          engine.previousTrack().catch(() => {});
          break;
        case 'next':
          engine.nextTrack().catch(() => {});
          break;
        case 'toggleShuffle':
          engine.toggleShuffle().catch(() => {});
          break;
        case 'cycleRepeat':
          engine.cycleRepeat().catch(() => {});
          break;
        default:
          break;
      }
    },
    [engine, cmd],
  );

  // ── Close button ──
  const handleClose = useCallback(() => {
    emit(MINI_CLOSE).catch(() => {});
    getCurrentWebviewWindow()
      .close()
      .catch(() => {});
  }, []);

  return (
    <div className={styles['mini-player']}>
      {/* Close button */}
      <button
        className={styles['close-btn']}
        onClick={handleClose}
        aria-label="Close mini-player"
        title="Close"
      >
        <CloseIcon />
      </button>

      {/* Content */}
      <div style={S.content}>
        {/* Album art */}
        {albumImage ? (
          <img
            src={albumImage ?? undefined}
            alt="Album cover"
            style={{
              width: 160,
              height: 160,
              borderRadius: 8,
              objectFit: 'cover',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              background: 'var(--lt-bg-elevated, #1a1a1a)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={S.artFallback}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
        )}

        {/* Track info */}
        <div style={S.info}>
          <div style={S.trackName} title={name ?? ''}>
            {name ?? 'No track'}
          </div>
          <div style={S.artist} title={artist ?? ''}>
            {artist ?? ''}
          </div>
        </div>

        {/* Progress bar (has its own rAF ticker — no duplicate here) */}
        <div style={S.progressSection}>
          <ProgressBar />
        </div>

        {/* Transport controls — icon sizes match NowPlayingView's TransportControls */}
        <div style={S.controls}>
          <button
            className={`ctrl-btn ${shuffle ? 'ctrl-active' : ''}`}
            onClick={() => act({ action: 'toggleShuffle' })}
            title="Shuffle"
            aria-label="Toggle shuffle"
          >
            <ShuffleIcon />
          </button>
          <button
            className="ctrl-btn"
            onClick={() => act({ action: 'previous' })}
            title="Previous"
            aria-label="Previous track"
          >
            <SkipIcon direction="prev" />
          </button>
          <button
            style={S.playBtn}
            onClick={playPause}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            className="ctrl-btn"
            onClick={() => act({ action: 'next' })}
            title="Next"
            aria-label="Next track"
          >
            <SkipIcon direction="next" />
          </button>
          <button
            className={`ctrl-btn ${repeat !== 'off' ? 'ctrl-active' : ''}`}
            onClick={() => act({ action: 'cycleRepeat' })}
            title={`Repeat: ${repeat}`}
            aria-label="Cycle repeat mode"
          >
            <RepeatIcon />
          </button>
        </div>

        {/* Volume */}
        <VolumeSlider />
      </div>
    </div>
  );
});
