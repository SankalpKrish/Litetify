import { useState } from 'react';
import { PlaylistList } from './PlaylistList';
import { LikedSongs } from './LikedSongs';
import { PodcastList } from './PodcastList';

interface LibraryViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

type LibTab = 'playlists' | 'liked' | 'podcasts';
type SortBy = 'name' | 'recent' | 'tracks';

export function LibraryView({ onNavigate }: LibraryViewProps) {
  const [tab, setTab] = useState<LibTab>('playlists');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');

  const sortOptions: { key: SortBy; label: string }[] = [
    { key: 'recent', label: 'Recent' },
    { key: 'name', label: 'A-Z' },
    { key: 'tracks', label: 'Tracks' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Your Library</h1>
      </div>

      <div
        className="search-tabs"
        style={{ marginBottom: 'var(--lt-space-xl)' }}
        role="tablist"
        aria-label="Library tabs"
        onKeyDown={(e) => {
          const libTabs: LibTab[] = ['playlists', 'liked', 'podcasts'];
          const idx = libTabs.indexOf(tab);
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setTab(libTabs[(idx + 1) % libTabs.length]);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setTab(libTabs[(idx - 1 + libTabs.length) % libTabs.length]);
          }
        }}
      >
        <button
          className={`search-tab${tab === 'playlists' ? ' search-tab-active' : ''}`}
          id="lib-tab-playlists"
          role="tab"
          aria-selected={tab === 'playlists'}
          aria-controls="lib-panel"
          onClick={() => setTab('playlists')}
        >
          Playlists
        </button>
        <button
          className={`search-tab${tab === 'liked' ? ' search-tab-active' : ''}`}
          id="lib-tab-liked"
          role="tab"
          aria-selected={tab === 'liked'}
          aria-controls="lib-panel"
          onClick={() => setTab('liked')}
        >
          Liked Songs
        </button>
        <button
          className={`search-tab${tab === 'podcasts' ? ' search-tab-active' : ''}`}
          id="lib-tab-podcasts"
          role="tab"
          aria-selected={tab === 'podcasts'}
          aria-controls="lib-panel"
          onClick={() => setTab('podcasts')}
        >
          Podcasts
        </button>
      </div>

      <div role="tabpanel" id="lib-panel" aria-labelledby={`lib-tab-${tab}`}>
        <div className="lib-toolbar">
          <div className="lib-search-wrap">
            <svg
              className="lib-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="lib-search-input"
              type="search"
              placeholder={`Search ${tab === 'playlists' ? 'playlists' : 'songs'}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="lib-sort">
            {sortOptions.map((o) => (
              <button
                key={o.key}
                className={`lib-sort-btn${sortBy === o.key ? ' lib-sort-btn--active' : ''}`}
                onClick={() => setSortBy(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'playlists' && (
          <PlaylistList query={query} sortBy={sortBy} onNavigate={onNavigate} />
        )}
        {tab === 'liked' && (
          <LikedSongs query={query} onNavigate={onNavigate} />
        )}
        {tab === 'podcasts' && <PodcastList onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
