/* eslint-disable react-refresh/only-export-components */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useContextMenuStore, type MenuTarget } from './contextMenuStore';
import { usePlaylists, playlistKeys } from '../../lib/queries/usePlaylists';
import { usePlayerStore } from '../player/playerStore';
import {
  apiAddToQueue,
  apiSaveToLibrary,
  apiRemoveFromLibrary,
  apiCheckLibrary,
  apiAddToPlaylist,
  apiRemoveFromPlaylist,
} from '../../lib/api';
import { usePinsStore } from '../pins/pinsStore';
import styles from './ContextMenu.module.css';

interface NavFn {
  (view: string, params?: Record<string, string>): void;
}

let navigateFn: NavFn | null = null;
/** App registers its navigation handler so menu items can navigate. */
export function setContextMenuNavigate(fn: NavFn): void {
  navigateFn = fn;
}

function idFromUri(uri: string): string {
  const parts = uri.split(':');
  return parts[parts.length - 1] ?? '';
}

function webUrlFor(uri: string): string {
  // spotify:track:ID -> https://open.spotify.com/track/ID
  const parts = uri.split(':');
  if (parts.length === 3)
    return `https://open.spotify.com/${parts[1]}/${parts[2]}`;
  return uri;
}

async function copy(text: string, _label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard unavailable
  }
}

interface MenuItemDef {
  label: string;
  onClick?: () => void;
  submenu?: MenuItemDef[];
  separator?: boolean;
  danger?: boolean;
}

/**
 * A submenu that positions itself relative to its parent item, flipping to the
 * left when there isn't room on the right, and clamping vertically so it stays
 * fully on screen.
 */
function SubMenu({ items }: { items: MenuItemDef[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    // Start off-screen-invisible to measure before painting at final spot.
    visibility: 'hidden',
    left: '100%',
    top: -5,
  });

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement; // the .context-menu-item-has-submenu row
    if (!el || !parent) return;
    const parentRect = parent.getBoundingClientRect();
    const { width: subW, height: subH } = el.getBoundingClientRect();
    const margin = 4;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: prefer right of the parent; flip to the left if it overflows.
    const spaceRight = vw - parentRect.right;
    const openLeft =
      spaceRight < subW + margin && parentRect.left > subW + margin;
    const left = openLeft ? -subW - 2 : parentRect.width + 2;

    // Vertical: align to the top of the parent, then clamp into the viewport.
    let top = -5;
    const absTop = parentRect.top + top;
    if (absTop + subH > vh - margin) {
      top = vh - margin - subH - parentRect.top;
    }
    if (parentRect.top + top < margin) {
      top = margin - parentRect.top;
    }

    setStyle({ visibility: 'visible', left, top });
  }, [items]);

  return (
    <div
      ref={ref}
      className={styles['context-menu'] + ' ' + styles['context-submenu']}
      role="menu"
      style={style}
    >
      {items.map((sub) => (
        <button
          key={sub.label}
          className={styles['context-menu-item']}
          role="menuitem"
          tabIndex={-1}
          onClick={sub.onClick}
        >
          {sub.label}
        </button>
      ))}
    </div>
  );
}

export function ContextMenu() {
  const { open, x, y, target, close } = useContextMenuStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [saved, setSaved] = useState<boolean | null>(null);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const { data: playlists } = usePlaylists(50);
  const queryClient = useQueryClient();
  const previousFocusRef = useRef<Element | null>(null);

  // Check Liked state for track targets when the menu opens.
  useEffect(() => {
    setSaved(null);
    setSubmenuOpen(false);
    if (open && target?.kind === 'track' && target.track.uri) {
      apiCheckLibrary([target.track.uri])
        .then((arr) => setSaved(arr[0] ?? false))
        .catch(() => setSaved(null));
    }
  }, [open, target]);

  // Clamp to viewport after render.
  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (nx + rect.width > window.innerWidth)
      nx = Math.max(8, window.innerWidth - rect.width - 8);
    if (ny + rect.height > window.innerHeight)
      ny = Math.max(8, window.innerHeight - rect.height - 8);
    setPos({ x: nx, y: ny });
  }, [open, x, y, target]);

  // Close on outside click / Escape / scroll.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onScroll = () => close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [open, close]);

  // Focus trap + restore on close.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    previousFocusRef.current = prev;
    requestAnimationFrame(() => {
      const items =
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      (items?.[0] as HTMLElement)?.focus();
    });
    return () => {
      (previousFocusRef.current as HTMLElement)?.focus();
    };
  }, [open]);

  const run = useCallback(
    (fn: () => void | Promise<void>) => {
      Promise.resolve(fn()).catch(() => {});
      close();
    },
    [close],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items =
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items || items.length === 0) return;
    const cur = Array.prototype.indexOf.call(items, document.activeElement);
    let dir = 0;
    switch (e.key) {
      case 'ArrowDown':
        dir = 1;
        break;
      case 'ArrowUp':
        dir = -1;
        break;
      case 'Tab':
        dir = e.shiftKey ? -1 : 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const next =
      cur === -1
        ? dir === 1
          ? 0
          : items.length - 1
        : (cur + dir + items.length) % items.length;
    items[next]?.focus();
  };

  if (!open || !target) return null;

  const items = buildItems(target, {
    saved,
    playlists: (playlists?.items ?? []).map((p) => ({
      id: p.id!,
      name: p.name!,
    })),
    submenuOpen,
    setSubmenuOpen,
    run,
    onPlaylistMutated: (playlistId: string) => {
      queryClient.invalidateQueries({
        queryKey: playlistKeys.tracks(playlistId),
      });
      queryClient.invalidateQueries({
        queryKey: playlistKeys.detail(playlistId),
      });
    },
  });

  return createPortal(
    <div
      ref={menuRef}
      className={styles['context-menu']}
      style={{ left: pos.x, top: pos.y }}
      role="menu"
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={`sep-${i}`} className={styles['context-menu-separator']} />
        ) : item.submenu ? (
          <div
            key={item.label}
            className={
              styles['context-menu-item'] + ' context-menu-item-has-submenu'
            }
            role="menuitem"
            tabIndex={-1}
            onMouseEnter={() => setSubmenuOpen(true)}
            onMouseLeave={() => setSubmenuOpen(false)}
          >
            <span>{item.label}</span>
            <svg
              className={styles['context-menu-chevron']}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {submenuOpen && item.submenu.length > 0 && (
              <SubMenu items={item.submenu} />
            )}
          </div>
        ) : (
          <button
            key={item.label}
            className={
              styles['context-menu-item'] +
              (item.danger ? ' ' + styles['context-menu-item-danger'] : '')
            }
            role="menuitem"
            onClick={item.onClick}
          >
            {item.label}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}

/** Build a "Pin to sidebar" / "Unpin from sidebar" menu item for a playlist or album. */
function pinItem(
  target: Extract<MenuTarget, { kind: 'playlist' | 'album' }>,
  run: (fn: () => void | Promise<void>) => void,
): MenuItemDef {
  const pinned = usePinsStore.getState().isPinned(target.uri);
  return {
    label: pinned ? 'Unpin from sidebar' : 'Pin to sidebar',
    onClick: () =>
      run(() => {
        if (pinned) {
          usePinsStore.getState().unpin(target.uri);
        } else {
          usePinsStore.getState().pin({
            id: target.id,
            name: target.name,
            image: target.image ?? '',
            uri: target.uri,
            type: target.kind,
          });
        }
      }),
  };
}

function buildItems(
  target: MenuTarget,
  ctx: {
    saved: boolean | null;
    playlists: { id: string; name: string }[];
    submenuOpen: boolean;
    setSubmenuOpen: (v: boolean) => void;
    run: (fn: () => void | Promise<void>) => void;
    onPlaylistMutated: (playlistId: string) => void;
  },
): MenuItemDef[] {
  const { saved, playlists, run, onPlaylistMutated } = ctx;
  const nav = navigateFn ?? (() => {});

  if (target.kind === 'track') {
    const track = target.track;
    const deviceId = usePlayerStore.getState().deviceId ?? undefined;
    const items: MenuItemDef[] = [
      {
        label: 'Add to queue',
        onClick: () =>
          run(async () => {
            await apiAddToQueue(track.uri!, deviceId);
          }),
      },
      { separator: true, label: '' },
      {
        label: 'Go to artist',
        onClick: () =>
          run(() => {
            if (track.artists![0]?.id)
              nav('artist', { id: track.artists![0].id! });
          }),
      },
      {
        label: 'Go to album',
        onClick: () =>
          run(() => {
            if (track.album?.id) nav('album', { id: track.album.id });
          }),
      },
      { separator: true, label: '' },
      saved
        ? {
            label: 'Remove from your Liked Songs',
            onClick: () =>
              run(async () => {
                await apiRemoveFromLibrary([track.uri!]);
              }),
          }
        : {
            label: 'Save to your Liked Songs',
            onClick: () =>
              run(async () => {
                await apiSaveToLibrary([track.uri!]);
              }),
          },
      {
        label: 'Add to playlist',
        submenu: playlists.map((pl) => ({
          label: pl.name,
          onClick: () =>
            run(async () => {
              await apiAddToPlaylist(pl.id, [track.uri!]);
            }),
        })),
      },
    ];

    // "Remove from this playlist" — only when the track is shown within a
    // playlist context (spotify:playlist:{id}).
    const ctxUri = target.contextUri;
    if (ctxUri && ctxUri.startsWith('spotify:playlist:')) {
      const pid = ctxUri.split(':')[2];
      items.push({
        label: 'Remove from this playlist',
        danger: true,
        onClick: () =>
          run(async () => {
            await apiRemoveFromPlaylist(pid, [track.uri!]);
            onPlaylistMutated(pid);
          }),
      });
    }

    items.push(
      { separator: true, label: '' },
      {
        label: 'Copy Song link',
        onClick: () => run(() => copy(webUrlFor(track.uri!), 'Song link')),
      },
      {
        label: 'Copy Spotify URI',
        onClick: () => run(() => copy(track.uri!, 'Spotify URI')),
      },
    );
    return items;
  }

  if (target.kind === 'playlist') {
    return [
      pinItem(target, run),
      { separator: true, label: '' },
      {
        label: 'Copy link to playlist',
        onClick: () => run(() => copy(webUrlFor(target.uri), 'Playlist link')),
      },
      {
        label: 'Copy Spotify URI',
        onClick: () => run(() => copy(target.uri, 'Spotify URI')),
      },
    ];
  }

  if (target.kind === 'album') {
    return [
      {
        label: 'Go to album',
        onClick: () => run(() => nav('album', { id: idFromUri(target.uri) })),
      },
      pinItem(target, run),
      { separator: true, label: '' },
      {
        label: 'Copy album link',
        onClick: () => run(() => copy(webUrlFor(target.uri), 'Album link')),
      },
      {
        label: 'Copy Spotify URI',
        onClick: () => run(() => copy(target.uri, 'Spotify URI')),
      },
    ];
  }

  // artist
  return [
    {
      label: 'Go to artist',
      onClick: () => run(() => nav('artist', { id: idFromUri(target.uri) })),
    },
    { separator: true, label: '' },
    {
      label: 'Copy artist link',
      onClick: () => run(() => copy(webUrlFor(target.uri), 'Artist link')),
    },
    {
      label: 'Copy Spotify URI',
      onClick: () => run(() => copy(target.uri, 'Spotify URI')),
    },
  ];
}
