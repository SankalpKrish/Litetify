import { useState, useRef, useEffect } from 'react';
import { useViewModeStore, type ViewMode } from './viewModeStore';

const LABELS: Record<ViewMode, string> = { compact: 'Compact', list: 'List' };

function CompactIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="5" cy="7" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17" r="1.4" fill="currentColor" stroke="none" />
      <line x1="10" y1="7" x2="20" y2="7" />
      <line x1="10" y1="17" x2="20" y2="17" />
    </svg>
  );
}

/** "View as" toggle for playlist/album track lists (Compact vs List). */
export function ViewAsMenu() {
  const { mode, setMode } = useViewModeStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="view-as" ref={ref}>
      <button
        className="view-as-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{LABELS[mode]}</span>
        {mode === 'compact' ? <CompactIcon /> : <ListIcon />}
      </button>
      {open && (
        <div className="view-as-menu" role="menu">
          <div className="view-as-heading">View as</div>
          {(['compact', 'list'] as ViewMode[]).map((m) => (
            <button
              key={m}
              className={`context-menu-item${mode === m ? ' view-as-item-active' : ''}`}
              role="menuitemradio"
              aria-checked={mode === m}
              onClick={() => {
                setMode(m);
                setOpen(false);
              }}
            >
              <span className="view-as-item-label">
                {m === 'compact' ? <CompactIcon /> : <ListIcon />}
                {LABELS[m]}
              </span>
              {mode === m && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
