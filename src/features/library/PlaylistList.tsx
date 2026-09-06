import { useState, useMemo } from 'react';
import { usePlaylists } from '../../lib/queries/usePlaylists';
import { getImage } from '../../lib/utils';
import { useContextMenuStore } from '../contextmenu/contextMenuStore';
import { CreatePlaylistDialog } from './CreatePlaylistDialog';

interface PlaylistListProps {
  query: string;
  sortBy: 'name' | 'recent' | 'tracks';
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

function DefaultImage() {
  return (
    <div
      className="card-image"
      style={{
        background: 'var(--lt-bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--lt-fg-tertiary)',
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </div>
  );
}

function CardImage({ src, alt }: { src: string; alt: string }) {
  if (!src) return <DefaultImage />;
  return (
    <img
      className="card-image"
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
    />
  );
}

export function PlaylistList({ query, sortBy, onNavigate }: PlaylistListProps) {
  const { data, isLoading, error, refetch } = usePlaylists(50);
  const openContextMenu = useContextMenuStore((s) => s.openMenu);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return null;
    let items = data.items;
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((pl) => (pl.name ?? '').toLowerCase().includes(q));
    }
    if (sortBy === 'name') {
      items = [...items].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? ''),
      );
    } else if (sortBy === 'tracks') {
      items = [...items].sort(
        (a, b) => (b.tracks?.total ?? 0) - (a.tracks?.total ?? 0),
      );
    }
    return { ...data, items };
  }, [data, query, sortBy]);

  if (isLoading) {
    return (
      <div className="card-grid" aria-hidden={true}>
        {Array.from({ length: 6 }).map((_, j) => (
          <div key={j} className="card" style={{ background: 'transparent' }}>
            <div className="card-image" style={{ background: 'transparent' }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Something went wrong</div>
        <div className="empty-state-desc">
          Could not load your playlists. Try again later.
        </div>
      </div>
    );
  }

  if (!filtered || !data || data.items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No playlists yet</div>
        <div className="empty-state-desc">
          Create a playlist on Spotify and it will appear here.
        </div>
      </div>
    );
  }

  if (query && filtered.items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-desc">No playlists match "{query}".</div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 className="sr-only">Playlists</h2>
        <button
          className="btn btn-secondary"
          onClick={() => setShowCreate(true)}
        >
          Create Playlist
        </button>
      </div>
      {showCreate && (
        <CreatePlaylistDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => refetch()}
        />
      )}
      <div className="card-grid">
        {filtered.items.map((pl) => (
          <div
            key={pl.id}
            className="card"
            onClick={() => onNavigate('playlist', { id: pl.id! })}
            onContextMenu={(e) => {
              e.preventDefault();
              openContextMenu(e.clientX, e.clientY, {
                kind: 'playlist',
                id: pl.id!,
                name: pl.name!,
                uri: `spotify:playlist:${pl.id!}`,
                image: getImage(pl.images, 64),
              });
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigate('playlist', { id: pl.id! });
              }
            }}
          >
            <CardImage src={getImage(pl.images)} alt={pl.name!} />
            <div>
              <div className="card-title">{pl.name}</div>
              <div className="card-subtitle">
                {pl.tracks?.total ?? 0} track
                {(pl.tracks?.total ?? 0) !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
