import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useModsStore } from '../mods';
import { useMe } from '../lib/queries/useMe';
import { LogoMark } from '../components/LogoMark';
import { PlaybackTimerBadge } from '../features/player/PlaybackTimerBadge';
import { PinnedList } from './PinnedList';
import styles from './Sidebar.module.css';
import { config } from '../lib/config';

const COLLAPSED_WIDTH = 72;
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 180;
const MAX_WIDTH = 420;

function loadCollapsed(): boolean {
  try {
    return config.getCached().sidebarCollapsed;
  } catch {
    /* fall through */
  }
  try {
    return localStorage.getItem('litetify:sidebarCollapsed') === 'true';
  } catch {
    return false;
  }
}

function loadWidth(): number {
  try {
    const w = config.getCached().sidebarWidth;
    if (typeof w === 'number' && w >= MIN_WIDTH) return w;
  } catch {
    /* fall through */
  }
  try {
    const w = Number(localStorage.getItem('litetify:sidebarWidth'));
    if (w >= MIN_WIDTH) return w;
  } catch {
    /* noop */
  }
  return DEFAULT_WIDTH;
}

function setCSSVar(width: number) {
  document.documentElement.style.setProperty(
    '--lt-sidebar-width',
    `${width}px`,
  );
}

function persistWidth(width: number) {
  try {
    config.update({ sidebarWidth: width }).catch(() => {
      try {
        localStorage.setItem('litetify:sidebarWidth', String(width));
      } catch {
        /* noop */
      }
    });
  } catch {
    try {
      localStorage.setItem('litetify:sidebarWidth', String(width));
    } catch {
      /* noop */
    }
  }
}

function persistCollapsed(state: boolean) {
  try {
    config.update({ sidebarCollapsed: state }).catch(() => {
      try {
        localStorage.setItem('litetify:sidebarCollapsed', String(state));
      } catch {
        /* noop */
      }
    });
  } catch {
    try {
      localStorage.setItem('litetify:sidebarCollapsed', String(state));
    } catch {
      /* noop */
    }
  }
}

interface SidebarProps {
  currentView: string;
  currentPlaylistId?: string;
  currentModId?: string;
  sidebarVisible?: boolean;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

const navItems = [
  { view: 'home', label: 'Home', icon: 'home' },
  { view: 'search', label: 'Search', icon: 'search' },
  { view: 'browse', label: 'Browse', icon: 'compass' },
  { view: 'library', label: 'Your Library', icon: 'library' },
];

const NavIcon = memo(function NavIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'home':
      return (
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
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'search':
      return (
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
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'library':
      return (
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
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'compass':
      return (
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
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case 'now-playing':
      return (
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
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16" />
        </svg>
      );
    case 'stats':
      return (
        <div
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--lt-accent)',
          }}
        >
          L
        </div>
      );
    default:
      return null;
  }
});

export function Sidebar({
  currentView,
  currentPlaylistId,
  currentModId,
  onNavigate,
  sidebarVisible = false,
}: SidebarProps) {
  const { data: me } = useMe();
  const customViews = useModsStore((s) => s.customViews);
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const initialisedRef = useRef(false);

  // Sidebar width state — loads persisted width, defaults to 240px
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const w = collapsed ? COLLAPSED_WIDTH : loadWidth();
    return w;
  });

  // Remembers the width before the user collapsed so we can restore it
  const lastWidthRef = useRef(loadWidth());

  // Apply --lt-sidebar-width CSS variable on mount and whenever width changes
  useEffect(() => {
    setCSSVar(sidebarWidth);
    // Persist on first real (non-collapsed) width
    if (initialisedRef.current && !collapsed) {
      persistWidth(sidebarWidth);
    }
    initialisedRef.current = true;
  }, [sidebarWidth, collapsed]);

  // Reflect collapsed state onto the .app-layout ancestor for CSS offset
  useEffect(() => {
    const layout = document.querySelector('.app-layout');
    if (layout) layout.classList.toggle('app-sidebar-collapsed', collapsed);
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      persistCollapsed(next);
      if (next) {
        // Collapsing — save current width, go to COLLAPSED_WIDTH
        lastWidthRef.current = sidebarWidth;
        setSidebarWidth(COLLAPSED_WIDTH);
      } else {
        // Expanding — restore last width
        setSidebarWidth(Math.max(lastWidthRef.current, MIN_WIDTH));
      }
      return next;
    });
  }, [sidebarWidth]);

  // Drag-to-resize
  const draggingRef = useRef(false);
  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      const startX = e.clientX;
      const startW = sidebarWidth;

      const onMove = (me: PointerEvent) => {
        if (!draggingRef.current) return;
        const newW = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, startW + (me.clientX - startX)),
        );
        setSidebarWidth(newW);
      };

      const onUp = () => {
        draggingRef.current = false;
        if (!collapsed) persistWidth(sidebarWidth);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [sidebarWidth, collapsed],
  );

  const sidebarItems = useMemo(() => {
    const items: { id: string; label: string; icon: string }[] = [];
    customViews.forEach((view, id) => {
      items.push({ id, label: view.label, icon: view.icon });
    });
    return items;
  }, [customViews]);

  return (
    <aside
      className={`${styles.sidebar}${collapsed ? ` ${styles['sidebar-collapsed']}` : ''}${sidebarVisible ? ` ${styles['sidebar-visible']}` : ''}`}
      aria-label="Sidebar"
      style={{ width: sidebarWidth }}
    >
      <div className={styles['sidebar-header']} data-tauri-drag-region>
        <div className={styles['sidebar-logo']}>
          <div className={styles['sidebar-logo-icon']}>
            <LogoMark size={28} variant="detail" decorative />
            <PlaybackTimerBadge />
          </div>
          <span className={styles['sidebar-logo-text']}>Litetify</span>
        </div>
        <button
          className={styles['sidebar-collapse-btn']}
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {collapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </div>

      {me && (
        <div className={styles['sidebar-user-profile']}>
          {me.images?.[0]?.url ? (
            <img
              src={me.images[0].url}
              alt=""
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--lt-accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {(me.display_name?.[0] || me.email?.[0] || '?').toUpperCase()}
            </div>
          )}
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {me.display_name || me.email || 'User'}
          </span>
        </div>
      )}
      <nav className={styles['sidebar-nav']}>
        {navItems.map((item) => (
          <button
            key={item.view}
            className={`${styles['sidebar-link']}${currentView === item.view ? ` ${styles['sidebar-link-active']}` : ''}`}
            onClick={() => onNavigate(item.view)}
            aria-label={item.label}
          >
            <span className={styles['sidebar-link-icon']}>
              <NavIcon icon={item.icon} />
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {sidebarItems.length > 0 && (
        <>
          <div className={styles['sidebar-section']}>Custom Apps</div>
          <div className={styles['sidebar-playlists']}>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`${styles['sidebar-playlist-item']}${currentModId === item.id ? ` ${styles['sidebar-playlist-item-active']}` : ''}`}
                onClick={() => onNavigate('mod', { modId: item.id })}
                aria-label={item.label}
              >
                {item.icon && (
                  <span className={styles['sidebar-link-icon']}>
                    <NavIcon icon={item.icon} />
                  </span>
                )}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      <PinnedList
        currentPlaylistId={currentPlaylistId}
        onNavigate={onNavigate}
      />

      <div className={styles['sidebar-footer']}>
        <button
          className={`${styles['sidebar-link']}${currentView === 'settings' ? ` ${styles['sidebar-link-active']}` : ''}`}
          onClick={() => onNavigate('settings')}
          aria-label="Settings"
        >
          <span className={styles['sidebar-link-icon']}>
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
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </span>
          Settings
        </button>
      </div>

      {/* Drag handle on the right edge */}
      <div
        className={styles['sidebar-resize-handle']}
        onPointerDown={collapsed ? undefined : onDragStart}
        aria-hidden="true"
      />
    </aside>
  );
}
