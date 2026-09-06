import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { queryClient } from './lib/queries/queryClient';
import { checkAuth } from './features/auth/authStore';
import { LoginScreen } from './features/auth/LoginScreen';
import { NowPlayingBar } from './features/player/NowPlayingBar';
import { PlayerInitializer } from './features/player/PlayerInitializer';
import { useAutoQueue } from './features/player/useAutoQueue';
import { usePlaybackTimer } from './features/player/usePlaybackTimer';
import { Sidebar } from './app/Sidebar';
import {
  ContextMenu,
  setContextMenuNavigate,
} from './features/contextmenu/ContextMenu';
import { BrandSpinner } from './components/BrandSpinner';
import { ErrorBoundary } from './lib/ErrorBoundary';
import { MiniPlayerView } from './features/player/MiniPlayerView';
import { MiniplayerHost } from './features/player/MiniplayerHost';
import { OfflineBanner } from './features/player/OfflineBanner';
import { initMods, useModsStore } from './mods';
import { setSidebarItemCallbacks } from './mods/api';
import { usePlayerStore } from './features/player/playerStore';
import {
  prefetchBrowseDiscover,
  prefetchBrowseGenres,
  FALLBACK_GENRES,
} from './lib/queries/useBrowse';

const HomeView = lazy(() =>
  import('./features/browse/HomeView').then((m) => ({ default: m.HomeView })),
);
const BrowseView = lazy(() =>
  import('./features/browse/BrowseView').then((m) => ({
    default: m.BrowseView,
  })),
);
const SearchView = lazy(() =>
  import('./features/search/SearchView').then((m) => ({
    default: m.SearchView,
  })),
);
const LibraryView = lazy(() =>
  import('./features/library/LibraryView').then((m) => ({
    default: m.LibraryView,
  })),
);
const PlaylistDetail = lazy(() =>
  import('./features/library/PlaylistDetail').then((m) => ({
    default: m.PlaylistDetail,
  })),
);
const AlbumView = lazy(() =>
  import('./features/library/AlbumView').then((m) => ({
    default: m.AlbumView,
  })),
);
const ArtistView = lazy(() =>
  import('./features/library/ArtistView').then((m) => ({
    default: m.ArtistView,
  })),
);
const SettingsView = lazy(() =>
  import('./features/settings/SettingsView').then((m) => ({
    default: m.SettingsView,
  })),
);
const NowPlayingView = lazy(() =>
  import('./features/player/NowPlayingView').then((m) => ({
    default: m.NowPlayingView,
  })),
);
const StatsView = lazy(() =>
  import('./features/stats/StatsView').then((m) => ({ default: m.StatsView })),
);
const PodcastView = lazy(() =>
  import('./features/podcasts/PodcastView').then((m) => ({
    default: m.PodcastView,
  })),
);

onlineManager.setOnline(navigator.onLine);
window.addEventListener('online', () => onlineManager.setOnline(true));
window.addEventListener('offline', () => onlineManager.setOnline(false));

type View =
  | { name: 'home' }
  | { name: 'search'; query?: string }
  | { name: 'library' }
  | { name: 'settings' }
  | { name: 'playlist'; id: string }
  | { name: 'album'; id: string }
  | { name: 'artist'; id: string }
  | { name: 'mod'; modId: string }
  | { name: 'now-playing' }
  | { name: 'stats' }
  | { name: 'podcast'; id: string }
  | { name: 'browse' };

function MiniApp(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <MiniPlayerView />
    </ErrorBoundary>
  );
}

function AppShell({
  initialAuth,
}: {
  initialAuth: 'authenticated' | 'unauthenticated';
}): React.JSX.Element {
  const isMini =
    typeof window !== 'undefined' &&
    new URL(window.location.href).searchParams.get('mini') === '1';

  // All hooks must be called before any early return (Rules of Hooks).
  const [authStatus, setAuthStatus] = useState<
    'loading' | 'authenticated' | 'unauthenticated'
  >(() => initialAuth);

  // View navigation history: `entries[index]` is the current view. Navigating
  // pushes (truncating any forward entries); back/forward move the index.
  // Kept in one state object so updates stay atomic.
  const [nav, setNav] = useState<{ entries: View[]; index: number }>({
    entries: [{ name: 'home' }],
    index: 0,
  });
  const currentView = nav.entries[nav.index];
  const canGoBack = nav.index > 0;
  const canGoForward = nav.index < nav.entries.length - 1;
  const customViews = useModsStore((s) => s.customViews);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      initMods().catch((err) => console.error('[mods] init failed:', err));
    }
  }, [authStatus]);

  // Prefetch browse discover data so it's available immediately when the user
  // navigates to the browse tab, instead of starting the fetch on mount.
  useEffect(() => {
    if (authStatus === 'authenticated') {
      prefetchBrowseDiscover();
      prefetchBrowseGenres(FALLBACK_GENRES);
    }
  }, [authStatus]);

  // Disable the native right-click menu app-wide so our custom menu is the only one.
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow native menu inside text inputs/textareas (copy/paste etc.).
      if (target.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);

  useEffect(() => {
    setSidebarItemCallbacks(
      (id, label, icon) => {
        useModsStore.getState().registerCustomView(id, label, () => null, icon);
      },
      (id) => {
        useModsStore.getState().unregisterCustomView(id);
      },
    );
  }, []);

  // Close mobile sidebar on navigation.
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentView.name]);

  const handleAuthenticated = useCallback(() => {
    checkAuth().then((hasTokens) => {
      setAuthStatus(hasTokens ? 'authenticated' : 'unauthenticated');
    });
  }, []);

  const handleLogout = useCallback(() => {
    setAuthStatus('unauthenticated');
  }, []);

  const pushView = useCallback((next: View) => {
    setNav((prev) => {
      const truncated = prev.entries.slice(0, prev.index + 1);
      const cur = truncated[truncated.length - 1];
      // Don't push a duplicate of the current view.
      if (cur && JSON.stringify(cur) === JSON.stringify(next)) return prev;
      const entries = [...truncated, next].slice(-50);
      return { entries, index: entries.length - 1 };
    });
  }, []);

  const goBack = useCallback(() => {
    setNav((prev) =>
      prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev,
    );
  }, []);

  const goForward = useCallback(() => {
    setNav((prev) =>
      prev.index < prev.entries.length - 1
        ? { ...prev, index: prev.index + 1 }
        : prev,
    );
  }, []);

  const handleNavigate = useCallback(
    (view: string, params?: Record<string, string>) => {
      switch (view) {
        case 'home':
          pushView({ name: 'home' });
          break;
        case 'search':
          pushView({ name: 'search', query: params?.query });
          break;
        case 'library':
          pushView({ name: 'library' });
          break;
        case 'settings':
          pushView({ name: 'settings' });
          break;
        case 'playlist':
          pushView({ name: 'playlist', id: params?.id ?? '' });
          break;
        case 'album':
          pushView({ name: 'album', id: params?.id ?? '' });
          break;
        case 'artist':
          pushView({ name: 'artist', id: params?.id ?? '' });
          break;
        case 'mod':
          pushView({ name: 'mod', modId: params?.modId ?? '' });
          break;
        case 'now-playing':
          pushView({ name: 'now-playing' });
          break;
        case 'stats':
          pushView({ name: 'stats' });
          break;
        case 'podcast':
          pushView({ name: 'podcast', id: params?.id ?? '' });
          break;
        case 'browse':
          pushView({ name: 'browse' });
          break;
      }
    },
    [pushView],
  );

  useEffect(() => {
    setContextMenuNavigate(handleNavigate);
  }, [handleNavigate]);

  useEffect(() => {
    const handler = (e: Event) => {
      const view = (e as CustomEvent).detail;
      if (typeof view === 'string') handleNavigate(view);
    };
    window.addEventListener('litetify:navigate', handler);
    return () => window.removeEventListener('litetify:navigate', handler);
  }, [handleNavigate]);

  // Global Space key toggles play/pause regardless of focus, without triggering
  // any focused button's click action.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
        return;
      e.preventDefault();
      const store = usePlayerStore.getState();
      const engine = store.engine;
      if (engine) {
        if (store.isPlaying) {
          engine.pause().catch(() => {});
        } else {
          engine.resume().catch(() => {});
        }
      } else {
        store.setState({ isPlaying: !store.isPlaying });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Blur buttons after mouse click so they do not keep a selected look.
  useEffect(() => {
    const onMouseUp = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.tagName === 'BUTTON') {
        setTimeout(() => active.blur(), 0);
      }
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  useAutoQueue();
  usePlaybackTimer();

  if (isMini) {
    return <MiniApp />;
  }

  if (authStatus === 'loading') {
    return (
      <main className="shell">
        <BrandSpinner label="Checking authentication..." />
        <p className="status">Checking authentication...</p>
      </main>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
  }

  const currentViewName = currentView.name;
  const currentPlaylistId =
    currentView.name === 'playlist' ? currentView.id : undefined;
  const currentModId =
    currentView.name === 'mod' ? currentView.modId : undefined;

  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="app-layout">
        <PlayerInitializer />
        <MiniplayerHost />
        <Sidebar
          currentView={currentViewName}
          currentPlaylistId={currentPlaylistId}
          currentModId={currentModId}
          sidebarVisible={mobileSidebarOpen}
          onNavigate={handleNavigate}
        />
        <div className="app-main">
          <div className="topbar">
            <div className="topbar-nav">
              <button
                className="topbar-nav-btn menu-toggle"
                onClick={() => setMobileSidebarOpen((o) => !o)}
                aria-label="Open sidebar"
                title="Menu"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <button
                className="topbar-nav-btn"
                onClick={goBack}
                disabled={!canGoBack}
                aria-label="Go back"
                title="Go back"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                className="topbar-nav-btn"
                onClick={goForward}
                disabled={!canGoForward}
                aria-label="Go forward"
                title="Go forward"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
          <main className="main-view" id="main-content">
            <Suspense
              fallback={<div className="empty-state" style={{ opacity: 0 }} />}
            >
              {currentView.name === 'home' && (
                <ErrorBoundary>
                  <HomeView onNavigate={handleNavigate} />
                </ErrorBoundary>
              )}
              {currentView.name === 'search' && (
                <ErrorBoundary>
                  <SearchView
                    onNavigate={handleNavigate}
                    initialQuery={currentView.query}
                  />
                </ErrorBoundary>
              )}
              {currentView.name === 'library' && (
                <ErrorBoundary>
                  <LibraryView onNavigate={handleNavigate} />
                </ErrorBoundary>
              )}
              {currentView.name === 'settings' && (
                <ErrorBoundary>
                  <SettingsView onLogout={handleLogout} />
                </ErrorBoundary>
              )}
              {currentView.name === 'playlist' && (
                <ErrorBoundary>
                  <PlaylistDetail
                    playlistId={currentView.id}
                    onNavigate={handleNavigate}
                  />
                </ErrorBoundary>
              )}
              {currentView.name === 'album' && (
                <ErrorBoundary>
                  <AlbumView
                    albumId={currentView.id}
                    onNavigate={handleNavigate}
                  />
                </ErrorBoundary>
              )}
              {currentView.name === 'artist' && (
                <ErrorBoundary>
                  <ArtistView
                    artistId={currentView.id}
                    onNavigate={handleNavigate}
                  />
                </ErrorBoundary>
              )}
              {currentView.name === 'now-playing' && (
                <ErrorBoundary>
                  <NowPlayingView onNavigate={handleNavigate} onBack={goBack} />
                </ErrorBoundary>
              )}
              {currentView.name === 'stats' && (
                <ErrorBoundary>
                  <StatsView onNavigate={handleNavigate} />
                </ErrorBoundary>
              )}
              {currentView.name === 'podcast' && (
                <ErrorBoundary>
                  <PodcastView
                    showId={currentView.id}
                    onNavigate={handleNavigate}
                  />
                </ErrorBoundary>
              )}
              {currentView.name === 'browse' && (
                <ErrorBoundary>
                  <BrowseView onNavigate={handleNavigate} />
                </ErrorBoundary>
              )}
              {currentView.name === 'mod' && (
                <ErrorBoundary>
                  <div className="mod-view">
                    {customViews.has(currentView.modId) ? (
                      customViews.get(currentView.modId)!.render()
                    ) : (
                      <p className="mod-not-found">Custom app not found.</p>
                    )}
                  </div>
                </ErrorBoundary>
              )}
            </Suspense>
          </main>
          <OfflineBanner />
          {currentView.name !== 'now-playing' && <NowPlayingBar />}
        </div>
        <ContextMenu />
      </div>
    </ErrorBoundary>
  );
}

export function App({
  initialAuth,
}: {
  initialAuth: 'authenticated' | 'unauthenticated';
}): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell initialAuth={initialAuth} />
    </QueryClientProvider>
  );
}
