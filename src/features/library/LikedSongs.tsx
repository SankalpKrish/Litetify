import { useMemo } from 'react';
import { useLikedTracks } from '../../lib/queries/useLikedTracks';
import { usePlayerStore } from '../player/playerStore';
import { TrackRow } from './TrackRow';

interface LikedSongsProps {
  query: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function LikedSongs({ query, onNavigate }: LikedSongsProps) {
  const { data, isLoading, error } = useLikedTracks(50);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const filtered = useMemo(() => {
    if (!data) return null;
    let items = data.items;
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((item) => {
        const t = item.track;
        if (!t) return false;
        return (
          (t.name?.toLowerCase().includes(q) ?? false) ||
          (t.artists &&
            t.artists.some((a) => (a.name ?? '').toLowerCase().includes(q))) ||
          (t.album && (t.album.name ?? '').toLowerCase().includes(q))
        );
      });
    }
    return { ...data, items };
  }, [data, query]);

  if (isLoading) {
    return (
      <div style={{ opacity: 0, pointerEvents: 'none' }} aria-hidden={true}>
        <div className="detail-header">
          <div className="detail-image" style={{ background: 'transparent' }} />
          <div className="detail-meta" style={{ flex: 1 }}>
            <div style={{ height: 14, marginBottom: 4 }} />
            <div style={{ height: 22, width: '30%' }} />
          </div>
        </div>
        <div className="detail-action-bar">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'transparent',
            }}
          />
        </div>
        <table className="track-table" style={{ opacity: 0 }}>
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Title</th>
              <th>Album</th>
              <th style={{ width: 60, textAlign: 'right' }}>Duration</th>
            </tr>
          </thead>
          <tbody>{/* empty — height reserved by table structure */}</tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Could not load liked songs</div>
        <div className="empty-state-desc">Try again later.</div>
      </div>
    );
  }

  if (!filtered || !data || data.items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No liked songs yet</div>
        <div className="empty-state-desc">
          Tap the heart icon on any track to save it here.
        </div>
      </div>
    );
  }

  if (query && filtered.items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-desc">No songs match "{query}".</div>
      </div>
    );
  }

  return (
    <div>
      <div className="detail-header">
        <div
          className="detail-image"
          style={{
            background:
              'linear-gradient(135deg, var(--lt-accent), var(--lt-bg-base))',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
              style={{ color: 'var(--lt-accent)' }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
        </div>
        <div className="detail-meta">
          <div className="detail-type">Playlist</div>
          <h2 className="sr-only">Liked Songs</h2>
          <div className="detail-stats">
            <strong>{filtered.total}</strong> song
            {filtered.total !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="detail-action-bar">
        <button
          className="play-btn"
          onClick={() => {
            const queue = filtered.items
              .map((i) => i.track?.uri)
              .filter((u): u is string => !!u);
            const first = filtered.items[0]?.track;
            if (first)
              playTrack(first.uri!, { uris: queue, offsetUri: first.uri! });
          }}
          aria-label="Play"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        </button>
      </div>

      <table className="track-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th>Title</th>
            <th>Album</th>
            <th style={{ width: 60, textAlign: 'right' }}>Duration</th>
          </tr>
        </thead>
        <tbody>
          {filtered.items.map((item, idx) => {
            const track = item.track;
            const queue = filtered.items
              .map((i) => i.track?.uri)
              .filter((u): u is string => !!u);
            return (
              <TrackRow
                key={track.id ?? `local-${idx}-${track.uri ?? ''}`}
                track={track}
                index={idx}
                queueUris={queue}
                onPlay={(uri, ctx) => playTrack(uri, ctx)}
                onNavigate={onNavigate}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
