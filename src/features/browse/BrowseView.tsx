import { useState, useEffect, useRef, useMemo } from 'react';
import { useMe } from '../../lib/queries/useMe';
import { useTopArtists } from '../../lib/queries/useHome';
import {
  useBrowseDiscover,
  useBrowseGenreSections,
  prefetchBrowseGenres,
  FALLBACK_GENRES,
} from '../../lib/queries/useBrowse';
import { getImage } from '../../lib/utils';
import { useContextMenuStore } from '../contextmenu/contextMenuStore';
import styles from './BrowseView.module.css';

interface BrowseViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function GenreNav({
  sections,
  sectionRefs,
}: {
  sections: { label: string }[];
  sectionRefs: React.MutableRefObject<(HTMLElement | null)[]>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const jump = (to: string | number) => {
    setOpen(false);
    if (to === 'discover') {
      document
        .querySelector('.browse-discover-section')
        ?.scrollIntoView({ behavior: 'smooth' });
    } else if (to !== '') {
      sectionRefs.current[Number(to)]?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--lt-bg-base)',
        padding: 'var(--lt-space-md) 0',
        marginBottom: 'var(--lt-space-lg)',
      }}
    >
      <div style={{ position: 'relative', maxWidth: '240px' }}>
        <button
          onClick={() => setOpen((p) => !p)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--lt-space-sm)',
            width: '100%',
            padding: 'var(--lt-space-sm) var(--lt-space-md)',
            borderRadius: 'var(--lt-radius-full)',
            border: '1px solid var(--lt-border)',
            background: 'var(--lt-bg-elevated)',
            color: 'var(--lt-fg-secondary)',
            fontSize: 'var(--lt-font-size-sm)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        >
          <span style={{ flex: 1, textAlign: 'left' }}>Jump to genre…</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              transition: 'transform 0.15s',
              transform: open ? 'rotate(180deg)' : undefined,
            }}
          >
            <path
              d="M3 5l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '100%',
              width: '100%',
              marginTop: 'var(--lt-space-xs)',
              background: 'var(--lt-bg-elevated)',
              border: '1px solid var(--lt-border)',
              borderRadius: 'var(--lt-radius-md)',
              boxShadow: 'var(--lt-shadow-lg)',
              overflowY: 'auto',
              maxHeight: 'min(50vh, 360px)',
              boxSizing: 'border-box',
              animation: 'context-menu-in 0.08s ease-out',
            }}
          >
            <button
              onClick={() => jump('discover')}
              style={{
                display: 'block',
                width: '100%',
                padding: 'var(--lt-space-md) var(--lt-space-lg)',
                background: 'none',
                border: 'none',
                color: 'var(--lt-fg-primary)',
                fontSize: 'var(--lt-font-size-sm)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--lt-bg-highlight)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              Discover
            </button>
            {sections.map((sec, i) => (
              <button
                key={i}
                onClick={() => jump(i)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 'var(--lt-space-md) var(--lt-space-lg)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--lt-fg-primary)',
                  fontSize: 'var(--lt-font-size-sm)',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--lt-bg-highlight)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'none')
                }
              >
                {sec.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function BrowseView({ onNavigate }: BrowseViewProps) {
  const openContextMenu = useContextMenuStore((s) => s.openMenu);
  const { data: user } = useMe();
  const { data: topArtists } = useTopArtists(50);
  const market = user?.country ?? undefined;

  // Stable shuffled fallback
  const fallbackPool = useMemo(() => shuffle(FALLBACK_GENRES), []);

  // Start with fallback genres; upgrade to personalized when available
  const genrePool = useMemo(() => {
    if (topArtists?.items?.length) {
      const genres = [
        ...new Set(topArtists.items.flatMap((a) => a.genres || [])),
      ].filter(Boolean);
      if (genres.length >= 2) return shuffle(genres).slice(0, 12);
    }
    return fallbackPool;
  }, [topArtists, fallbackPool]);

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // Discover section: fetched via React Query, prefetched on app startup
  const { data: discoverItems = [], isLoading: discoverLoading } =
    useBrowseDiscover(market);

  // Genre sections: loaded via React Query cache, prefetched on app startup.
  // When topArtists resolves with personalized genres, refresh the cache.
  const genreSections = useBrowseGenreSections();
  useEffect(() => {
    if (genrePool.length > 0) {
      prefetchBrowseGenres(genrePool, market);
    }
  }, [genrePool, market]);

  // Update section refs when data arrives
  useEffect(() => {
    if (genreSections.length > 0) {
      sectionRefs.current = genreSections.map(() => null);
    }
  }, [genreSections]);

  // ── Discover section (always shown) ──
  const discoverSection = (
    <section style={{ marginBottom: 'var(--lt-space-2xl)' }}>
      <div className="section-header">
        <h2 className="section-title">Discover</h2>
      </div>
      {discoverLoading || discoverItems.length === 0 ? (
        <div className="card-grid" aria-hidden={discoverLoading}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ background: 'transparent' }}>
              <div className="card-image" />
            </div>
          ))}
        </div>
      ) : (
        <div className="card-grid">
          {discoverItems.map((album) => (
            <div
              key={album.id}
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
              onContextMenu={(e) => {
                e.preventDefault();
                openContextMenu(e.clientX, e.clientY, {
                  kind: 'album',
                  id: album.id!,
                  name: album.name!,
                  uri: album.uri || `spotify:album:${album.id!}`,
                  image: getImage(album.images, 64),
                });
              }}
            >
              <img
                className="card-image"
                src={getImage(album.images)}
                alt={album.name}
                loading="lazy"
              />
              <div>
                <div className="card-title">{album.name}</div>
                {album.artists && (
                  <div className="card-subtitle">
                    {album.artists.map((a) => a.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  // ── Layout: shown immediately, sections use invisible placeholders until loaded ──
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Browse</h1>
      </div>

      {/* Genre jump dropdown (only when sections have loaded) */}
      {genreSections.length > 1 && (
        <GenreNav sections={genreSections} sectionRefs={sectionRefs} />
      )}

      {/* Discover section with anchor for nav scroll */}
      <div className={styles['browse-discover-section']}>{discoverSection}</div>

      {/* Genre sections (show skeletons until loaded) */}
      {genreSections.length === 0
        ? // Pre-loading: invisible placeholder sections matching the number of genres
          Array.from({ length: Math.min(genrePool.length, 6) }).map((_, i) => (
            <section
              key={i}
              style={{
                marginBottom: 'var(--lt-space-2xl)',
                opacity: 0,
                pointerEvents: 'none',
              }}
              aria-hidden={true}
            >
              <div className="section-header">
                <h2
                  className="section-title"
                  style={{ height: 0, overflow: 'hidden' }}
                >
                  {' '}
                </h2>
              </div>
              <div className="card-grid">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div
                    key={j}
                    className="card"
                    style={{ background: 'transparent' }}
                  >
                    <div
                      className="card-image"
                      style={{ background: 'transparent' }}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))
        : genreSections.map((sec, i) => (
            <section
              key={i}
              ref={(el) => {
                sectionRefs.current[i] = el;
              }}
              style={{ marginBottom: 'var(--lt-space-2xl)' }}
            >
              <div className="section-header">
                <h2 className="section-title">{sec.label}</h2>
                <button
                  className={styles['view-all-btn']}
                  onClick={() => onNavigate('search', { query: genrePool[i] })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--lt-fg-tertiary)',
                    cursor: 'pointer',
                    fontSize: 'var(--lt-font-size-sm)',
                    padding: 0,
                    marginLeft: 'auto',
                  }}
                >
                  View more
                </button>
              </div>
              {sec.items.length === 0 ? (
                <div className="card-grid" aria-hidden={true}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div
                      key={j}
                      className="card"
                      style={{ background: 'transparent' }}
                    >
                      <div
                        className="card-image"
                        style={{ background: 'transparent' }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-grid">
                  {sec.items.map((album) => (
                    <div
                      key={album.id}
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
                      onContextMenu={(e) => {
                        e.preventDefault();
                        openContextMenu(e.clientX, e.clientY, {
                          kind: 'album',
                          id: album.id!,
                          name: album.name!,
                          uri: album.uri || `spotify:album:${album.id!}`,
                          image: getImage(album.images, 64),
                        });
                      }}
                    >
                      <img
                        className="card-image"
                        src={getImage(album.images)}
                        alt={album.name}
                        loading="lazy"
                      />
                      <div>
                        <div className="card-title">{album.name}</div>
                        {album.artists && (
                          <div className="card-subtitle">
                            {album.artists.map((a) => a.name).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
    </div>
  );
}
