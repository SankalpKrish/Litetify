import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearch } from '../../lib/queries/useSearch';
import { getImage, formatDuration } from '../../lib/utils';
import { usePlayerStore } from '../player/playerStore';
import { useContextMenuStore } from '../contextmenu/contextMenuStore';
import { TrackMenuButton } from '../contextmenu/TrackMenuButton';
import type { SearchType } from '../../lib/types';
import styles from './SearchView.module.css';

type TabType = 'all' | 'track' | 'artist' | 'album' | 'playlist';

const tabMap: Record<TabType, SearchType[]> = {
  all: ['track', 'artist', 'album', 'playlist'],
  track: ['track'],
  artist: ['artist'],
  album: ['album'],
  playlist: ['playlist'],
};

interface SearchViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  initialQuery?: string;
}

export function SearchView({ onNavigate, initialQuery }: SearchViewProps) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [debounced, setDebounced] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { data, isLoading, isError, error } = useSearch(
    debounced,
    tabMap[activeTab],
    10,
  );
  const playTrack = usePlayerStore((s) => s.playTrack);
  const openContextMenu = useContextMenuStore((s) => s.openMenu);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(query), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    },
    [],
  );

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'track', label: 'Tracks' },
    { key: 'artist', label: 'Artists' },
    { key: 'album', label: 'Albums' },
    { key: 'playlist', label: 'Playlists' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Search</h1>
      </div>

      <div className={styles['search-input-wrap']}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: 'absolute',
            left: 'var(--lt-space-lg)',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--lt-fg-tertiary)',
            pointerEvents: 'none',
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <label htmlFor="search-input" className="sr-only">
          Search for music
        </label>
        <input
          id="search-input"
          className={styles['search-input']}
          type="text"
          autoComplete="off"
          placeholder="What do you want to listen to?"
          value={query}
          onChange={handleQueryChange}
          autoFocus
        />
      </div>

      {debounced && (
        <div
          className="search-tabs"
          role="tablist"
          aria-label="Search filters"
          onKeyDown={(e) => {
            const keys = tabs.map((t) => t.key);
            const idx = keys.indexOf(activeTab);
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              setActiveTab(keys[(idx + 1) % keys.length]);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setActiveTab(keys[(idx - 1 + keys.length) % keys.length]);
            }
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              id={`search-tab-${tab.key}`}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls="search-panel"
              className={`search-tab${activeTab === tab.key ? ' search-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div
        role="tabpanel"
        id="search-panel"
        aria-labelledby={`search-tab-${activeTab}`}
      >
        {!debounced && (
          <div className="empty-state">
            <div className="empty-state-title">Search your music</div>
            <div className="empty-state-desc">
              Find tracks, artists, albums, and playlists.
            </div>
          </div>
        )}

        {isLoading && debounced && (
          <div style={{ opacity: 0, pointerEvents: 'none' }} aria-hidden={true}>
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
        )}

        {isError && debounced && (
          <div className="empty-state">
            <div className="empty-state-title">Search failed</div>
            <div className="empty-state-desc">
              {error?.message
                ? `Error: ${error.message}`
                : 'Something went wrong. Check your connection and try again.'}
            </div>
          </div>
        )}

        {!isLoading && !isError && debounced && data && (
          <>
            {(activeTab === 'all' || activeTab === 'track') &&
              data.tracks?.items != null &&
              data.tracks.items.length > 0 && (
                <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
                  <div className="section-header">
                    <h2 className="section-title">Tracks</h2>
                  </div>
                  <table className="track-table">
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}>#</th>
                        <th>Title</th>
                        <th>Album</th>
                        <th style={{ width: 60, textAlign: 'right' }}>
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tracks?.items?.slice(0, 10).map((track, idx) => {
                        const queue = (data.tracks?.items ?? [])
                          .slice(0, 10)
                          .map((t) => t.uri)
                          .filter((x): x is string => x != null);
                        return (
                          <tr
                            key={track.id ?? `local-${idx}-${track.uri}`}
                            className="track-row"
                            onClick={() =>
                              playTrack(track.uri!, {
                                uris: queue,
                                offsetUri: track.uri!,
                              })
                            }
                            onContextMenu={(e) => {
                              e.preventDefault();
                              openContextMenu(e.clientX, e.clientY, {
                                kind: 'track',
                                track,
                                queueUris: queue,
                              });
                            }}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')
                                playTrack(track.uri!, {
                                  uris: queue,
                                  offsetUri: track.uri!,
                                });
                            }}
                          >
                            <td className="track-number">
                              <span className="track-number-static">
                                {idx + 1}
                              </span>
                              <span className="track-number-play">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <polygon points="8,5 19,12 8,19" />
                                </svg>
                              </span>
                            </td>
                            <td>
                              <div className="track-info">
                                <div className="track-name">
                                  {track.explicit && (
                                    <span className="track-explicit">E</span>
                                  )}
                                  {track.name ?? ''}
                                </div>
                                <div className="track-artist">
                                  {(track.artists ?? []).map((a, i) => (
                                    <span key={a.id!}>
                                      {i > 0 && ', '}
                                      <button
                                        className="track-artist-link"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onNavigate('artist', { id: a.id! });
                                        }}
                                      >
                                        {a.name!}
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td>
                              {track.album && (
                                <button
                                  className="track-album"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate('album', {
                                      id: track.album!.id!,
                                    });
                                  }}
                                >
                                  {track.album.name!}
                                </button>
                              )}
                            </td>
                            <td className="track-duration">
                              <span className="track-duration-text">
                                {formatDuration(track.duration_ms ?? 0)}
                              </span>
                              <TrackMenuButton
                                track={track}
                                queueUris={queue}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              )}

            {(activeTab === 'all' || activeTab === 'artist') &&
              data.artists?.items != null &&
              data.artists.items.length > 0 && (
                <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
                  <div className="section-header">
                    <h2 className="section-title">Artists</h2>
                  </div>
                  <div className="card-grid">
                    {data.artists?.items?.slice(0, 10).map((artist) => (
                      <div
                        key={artist.id!}
                        className="card"
                        onClick={() => onNavigate('artist', { id: artist.id! })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onNavigate('artist', { id: artist.id! });
                          }
                        }}
                      >
                        <img
                          className="card-image card-image-round"
                          src={getImage(artist.images)}
                          alt={artist.name!}
                          loading="lazy"
                        />
                        <div>
                          <div className="card-title">{artist.name!}</div>
                          <div className="card-subtitle">Artist</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {(activeTab === 'all' || activeTab === 'album') &&
              data.albums?.items != null &&
              data.albums.items.length > 0 && (
                <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
                  <div className="section-header">
                    <h2 className="section-title">Albums</h2>
                  </div>
                  <div className="card-grid">
                    {data.albums?.items?.slice(0, 10).map((album) => (
                      <div
                        key={album.id!}
                        className="card"
                        onClick={() => onNavigate('album', { id: album.id! })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onNavigate('album', { id: album.id! });
                          }
                        }}
                      >
                        <img
                          className="card-image"
                          src={getImage(album.images)}
                          alt={album.name!}
                          loading="lazy"
                        />
                        <div>
                          <div className="card-title">{album.name!}</div>
                          <div className="card-subtitle">
                            {(album.artists ?? [])
                              .map((a) => a.name!)
                              .join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {(activeTab === 'all' || activeTab === 'playlist') &&
              data.playlists?.items != null &&
              data.playlists.items.length > 0 && (
                <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
                  <div className="section-header">
                    <h2 className="section-title">Playlists</h2>
                  </div>
                  <div className="card-grid">
                    {data.playlists?.items?.slice(0, 10).map((pl) => (
                      <div
                        key={pl.id!}
                        className="card"
                        onClick={() => onNavigate('playlist', { id: pl.id! })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onNavigate('playlist', { id: pl.id! });
                          }
                        }}
                      >
                        <img
                          className="card-image"
                          src={getImage(pl.images)}
                          alt={pl.name!}
                          loading="lazy"
                        />
                        <div>
                          <div className="card-title">{pl.name!}</div>
                          <div className="card-subtitle">
                            {pl.tracks?.total ?? 0} tracks
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {data.tracks?.items?.length === 0 &&
              data.artists?.items?.length === 0 &&
              data.albums?.items?.length === 0 &&
              data.playlists?.items?.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">
                    No results for "{debounced}"
                  </div>
                  <div className="empty-state-desc">
                    Check the spelling or try a different search.
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}
