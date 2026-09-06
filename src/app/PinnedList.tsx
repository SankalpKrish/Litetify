import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useContextMenuStore } from '../features/contextmenu/contextMenuStore';
import { usePinsStore } from '../features/pins/pinsStore';
import {
  PIN_REORDER_CANCEL_PX,
  PIN_REORDER_HOLD_MS,
  dropIndexFromClientY,
  moveItem,
} from '../features/pins/reorder';
import styles from './Sidebar.module.css';

const PlaylistThumb = memo(function PlaylistThumb({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  if (src) {
    return (
      <img
        className={styles['sidebar-playlist-thumb']}
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    );
  }
  return (
    <span
      className={`${styles['sidebar-playlist-thumb']} ${styles['sidebar-playlist-thumb-fallback']}`}
      aria-hidden="true"
      title={alt}
    >
      <svg
        width="14"
        height="14"
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
    </span>
  );
});

interface PinnedListProps {
  currentPlaylistId?: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

type DragSession = {
  pointerId: number;
  uri: string;
  fromIndex: number;
  currentIndex: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  holdTimer: number;
  active: boolean;
};

type FloatState = {
  name: string;
  image: string;
  width: number;
  height: number;
};

export function PinnedList({ currentPlaylistId, onNavigate }: PinnedListProps) {
  const pins = usePinsStore((s) => s.pins);
  const reorder = usePinsStore((s) => s.reorder);
  const openContextMenu = useContextMenuStore((s) => s.openMenu);
  const listRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [draggingUri, setDraggingUri] = useState<string | null>(null);
  const [float, setFloat] = useState<FloatState | null>(null);

  const dragFromIndex =
    draggingUri === null ? -1 : pins.findIndex((p) => p.uri === draggingUri);
  const displayed =
    draggingUri !== null && overIndex !== null && dragFromIndex >= 0
      ? moveItem(pins, dragFromIndex, overIndex)
      : pins;

  const positionFloat = useCallback(
    (x: number, y: number, ox: number, oy: number) => {
      const el = floatRef.current;
      if (!el) return;
      el.style.left = `${x - ox}px`;
      el.style.top = `${y - oy}px`;
    },
    [],
  );

  useLayoutEffect(() => {
    if (!float) return;
    const session = sessionRef.current;
    if (!session?.active) return;
    positionFloat(
      session.lastX,
      session.lastY,
      session.grabOffsetX,
      session.grabOffsetY,
    );
  }, [float, positionFloat]);

  const endSession = useCallback(
    (commit: boolean) => {
      const session = sessionRef.current;
      if (!session) return;
      window.clearTimeout(session.holdTimer);
      const wasActive = session.active;
      if (wasActive && commit) {
        reorder(session.fromIndex, session.currentIndex);
      }
      sessionRef.current = null;
      setOverIndex(null);
      setDraggingUri(null);
      setFloat(null);
      document.documentElement.classList.remove('lt-pin-reordering');
      if (wasActive) suppressClickRef.current = true;
    },
    [reorder],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      session.lastX = e.clientX;
      session.lastY = e.clientY;

      if (!session.active) {
        const dx = e.clientX - session.startX;
        const dy = e.clientY - session.startY;
        if (Math.hypot(dx, dy) > PIN_REORDER_CANCEL_PX) {
          window.clearTimeout(session.holdTimer);
          sessionRef.current = null;
        }
        return;
      }

      positionFloat(
        e.clientX,
        e.clientY,
        session.grabOffsetX,
        session.grabOffsetY,
      );

      const list = listRef.current;
      if (!list) return;

      const rect = list.getBoundingClientRect();
      const edge = 32;
      if (e.clientY < rect.top + edge) list.scrollTop -= 12;
      else if (e.clientY > rect.bottom - edge) list.scrollTop += 12;

      const nextIndex = dropIndexFromClientY(list, e.clientY, session.uri);
      if (nextIndex === session.currentIndex) return;
      session.currentIndex = nextIndex;
      setOverIndex(nextIndex);
    };

    const onUp = (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      endSession(true);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      window.clearTimeout(sessionRef.current?.holdTimer ?? 0);
      document.documentElement.classList.remove('lt-pin-reordering');
    };
  }, [endSession, positionFloat]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, uri: string, index: number) => {
      if (e.button !== 0) return;
      if (pins.length < 2) return;
      if (sessionRef.current?.active) return;

      window.clearTimeout(sessionRef.current?.holdTimer ?? 0);
      const target = e.currentTarget;
      const pointerId = e.pointerId;
      const holdTimer = window.setTimeout(() => {
        const session = sessionRef.current;
        if (!session || session.holdTimer !== holdTimer) return;
        const rect = target.getBoundingClientRect();
        const x = session.lastX;
        const y = session.lastY;
        session.active = true;
        session.grabOffsetX = x - rect.left;
        session.grabOffsetY = y - rect.top;
        const item = usePinsStore
          .getState()
          .pins.find((p) => p.uri === session.uri);
        setDraggingUri(uri);
        setOverIndex(session.fromIndex);
        setFloat(
          item
            ? {
                name: item.name,
                image: item.image,
                width: rect.width,
                height: rect.height,
              }
            : null,
        );
        document.documentElement.classList.add('lt-pin-reordering');
        try {
          target.setPointerCapture(pointerId);
        } catch {
          /* jsdom / unmounted */
        }
      }, PIN_REORDER_HOLD_MS);

      sessionRef.current = {
        pointerId,
        uri,
        fromIndex: index,
        currentIndex: index,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        grabOffsetX: 0,
        grabOffsetY: 0,
        holdTimer,
        active: false,
      };
    },
    [pins.length],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (sessionRef.current?.active) return;
      if (!e.altKey) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const toIndex = e.key === 'ArrowUp' ? index - 1 : index + 1;
      reorder(index, toIndex);
    },
    [reorder],
  );

  if (pins.length === 0) return null;

  return (
    <>
      <div className={styles['sidebar-section']} id="pinned-heading">
        Pinned
      </div>
      <p id="pinned-reorder-hint" className="sr-only">
        Click and hold a pin to reorder. Use Alt+Arrow Up or Alt+Arrow Down to
        move the focused pin.
      </p>
      <div
        ref={listRef}
        className={`${styles['sidebar-playlists']}${draggingUri ? ` ${styles['sidebar-playlists-reordering']}` : ''}`}
        role="list"
        aria-labelledby="pinned-heading"
      >
        {displayed.map((item) => {
          const isActive =
            item.type === 'playlist' && currentPlaylistId === item.id;
          const isDragging = draggingUri === item.uri;
          return (
            <div
              key={item.uri}
              role="listitem"
              className={styles['sidebar-pin-entry']}
            >
              <button
                type="button"
                data-pin-uri={item.uri}
                className={`${styles['sidebar-playlist-item']} ${styles['sidebar-pin-item']}${isActive ? ` ${styles['sidebar-playlist-item-active']}` : ''}${isDragging ? ` ${styles['sidebar-playlist-item-dragging']}` : ''}`}
                onClick={(e) => {
                  if (suppressClickRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    suppressClickRef.current = false;
                    return;
                  }
                  onNavigate(item.type, { id: item.id });
                }}
                onPointerDown={(e) =>
                  onPointerDown(
                    e,
                    item.uri,
                    pins.findIndex((p) => p.uri === item.uri),
                  )
                }
                onKeyDown={(e) =>
                  onKeyDown(
                    e,
                    pins.findIndex((p) => p.uri === item.uri),
                  )
                }
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openContextMenu(e.clientX, e.clientY, {
                    kind: item.type,
                    id: item.id,
                    name: item.name,
                    uri: item.uri,
                  });
                }}
                aria-label={item.name}
                aria-grabbed={isDragging}
                aria-describedby="pinned-reorder-hint"
                aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
              >
                <PlaylistThumb src={item.image} alt={item.name} />
                <span className={styles['sidebar-playlist-name']}>
                  {item.name}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {float &&
        createPortal(
          <div
            ref={floatRef}
            className={`${styles['sidebar-playlist-item']} ${styles['sidebar-pin-item']} ${styles['sidebar-pin-float']}`}
            style={{ width: float.width, height: float.height }}
            aria-hidden="true"
          >
            <PlaylistThumb src={float.image} alt={float.name} />
            <span className={styles['sidebar-playlist-name']}>
              {float.name}
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}
