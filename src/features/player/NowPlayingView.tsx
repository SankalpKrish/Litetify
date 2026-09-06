import { memo, useCallback } from 'react';
import { usePlayerStore } from './playerStore';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import {
  BackIcon,
  ShuffleIcon,
  SkipIcon,
  PlayIcon,
  PauseIcon,
  RepeatIcon,
} from '../../components/icons';

// ── Styles ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'var(--lt-bg-base, #080808)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    overflow: 'auto',
  },
  overlayEmpty: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'var(--lt-bg-base, #080808)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: 'var(--lt-fg-secondary, #b3b3b3)',
    cursor: 'pointer',
    borderRadius: 'var(--lt-radius-full, 50%)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    maxWidth: 480,
    width: '100%',
  },
  art: {
    width: 300,
    height: 300,
    borderRadius: 8,
    objectFit: 'cover',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    background: 'var(--lt-bg-elevated, #1a1a1a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  artFallback: {
    width: 300,
    height: 300,
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
    gap: 4,
    width: '100%',
  },
  trackName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--lt-fg-primary, #fff)',
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  artist: {
    fontSize: '0.95rem',
    color: 'var(--lt-fg-secondary, #b3b3b3)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  albumLink: {
    fontSize: '0.9rem',
    color: 'var(--lt-fg-secondary, #b3b3b3)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textDecoration: 'underline',
    textDecorationColor: 'transparent',
    transition: 'text-decoration-color 0.15s',
  },
  progressSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  playBtn: {
    width: 56,
    height: 56,
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
    gap: 8,
    width: '100%',
    maxWidth: 300,
  },
  volumeBar: {
    flex: 1,
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
  emptyText: {
    fontSize: '1.1rem',
    color: 'var(--lt-fg-secondary, #b3b3b3)',
    marginTop: 16,
  },
};

// ── Component ───────────────────────────────────────────────────────────────

interface NowPlayingViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onBack: () => void;
}

function NowPlayingViewInner({ onNavigate, onBack }: NowPlayingViewProps) {
  const name = usePlayerStore((s) => s.name);
  const artist = usePlayerStore((s) => s.artist);
  const album = usePlayerStore((s) => s.album);
  const albumImage = usePlayerStore((s) => s.albumImage);
  const albumUri = usePlayerStore((s) => s.albumUri);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const engine = usePlayerStore((s) => s.engine);

  const togglePlay = useCallback(() => {
    if (!engine) return;
    if (isPlaying) engine.pause().catch(() => {});
    else engine.resume().catch(() => {});
  }, [isPlaying, engine]);

  const act = useCallback(
    (fn: () => Promise<void>) => {
      if (engine) fn().catch(() => {});
    },
    [engine],
  );

  const handleAlbumClick = useCallback(() => {
    if (!albumUri) return;
    // spotify:album:<id> → extract the ID
    const parts = albumUri.split(':');
    const id = parts[parts.length - 1];
    if (id) onNavigate('album', { id });
  }, [albumUri, onNavigate]);

  // ── Volume (delegated to VolumeControl) ──────────────────────────────────

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!name) {
    return (
      <div style={S.overlayEmpty}>
        <button
          className="ctrl-btn"
          style={S.backBtn}
          onClick={onBack}
          aria-label="Back"
        >
          <BackIcon />
        </button>
        <div style={S.artFallback}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <div style={S.emptyText}>No track playing</div>
      </div>
    );
  }

  return (
    <div style={S.overlay}>
      {/* Back */}
      <button
        className="ctrl-btn"
        style={S.backBtn}
        onClick={onBack}
        aria-label="Back"
      >
        <BackIcon />
      </button>

      {/* Content */}
      <div style={S.content}>
        {/* Album art */}
        {albumImage ? (
          <img
            src={albumImage}
            alt={`${album ?? 'Album'} cover`}
            style={S.art}
          />
        ) : (
          <div style={S.artFallback}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
        )}

        {/* Track info */}
        <div style={S.info}>
          <div style={S.trackName} title={name}>
            {name}
          </div>
          <div style={S.artist} title={artist ?? ''}>
            {artist}
          </div>
          {album &&
            (albumUri ? (
              <button
                style={S.albumLink}
                onClick={handleAlbumClick}
                title={album}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.textDecorationColor =
                    '';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.textDecorationColor =
                    'transparent';
                }}
              >
                {album}
              </button>
            ) : (
              <div style={S.albumLink as React.CSSProperties}>{album}</div>
            ))}
        </div>

        {/* Progress bar */}
        <div style={S.progressSection}>
          <ProgressBar />
        </div>

        {/* Transport controls */}
        <div style={S.controls}>
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
            onClick={() => act(() => engine!.previousTrack())}
            title="Previous"
            aria-label="Previous track"
          >
            <SkipIcon direction="prev" />
          </button>
          <button
            style={S.playBtn}
            onClick={togglePlay}
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
          </button>
        </div>

        {/* Volume */}
        <div style={S.volumeSection}>
          <VolumeControl />
        </div>
      </div>
    </div>
  );
}

export const NowPlayingView = memo(NowPlayingViewInner);
