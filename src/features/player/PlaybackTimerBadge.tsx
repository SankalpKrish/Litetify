import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerStore } from './playerStore';
import {
  getSessionStats,
  formatDuration,
  getTopArtists,
} from './playbackTimer';

export function PlaybackTimerBadge() {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [totalPlayTime, setTotalPlayTime] = useState(0);
  const [tracksCount, setTracksCount] = useState(0);
  const [topArtists, setTopArtists] = useState<
    { name: string; count: number }[]
  >([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Update stats only when visible
  useEffect(() => {
    if (!isHovered && !isExpanded) return;

    const interval = setInterval(() => {
      const stats = getSessionStats();
      setTotalPlayTime(stats.totalPlayTime);
      setTracksCount(stats.tracksPlayed.length);
    }, 1000);

    return () => clearInterval(interval);
  }, [isHovered, isExpanded]);

  // Update top lists when expanding
  useEffect(() => {
    if (isExpanded) {
      setTopArtists(getTopArtists(5));
    }
  }, [isExpanded]);

  // Click outside to close
  useEffect(() => {
    if (!isExpanded) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        badgeRef.current &&
        !badgeRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false);
      }
    }

    // Delay adding listener to avoid immediate close from the same click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const handleClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // Calculate popover position from badge
  const getPopoverStyle = (): React.CSSProperties => {
    if (!badgeRef.current) return { display: 'none' };

    const rect = badgeRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      top: rect.bottom + 8,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)),
      width: 280,
      maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto' as const,
      background: 'var(--lt-bg-elevated)',
      border: '1px solid var(--lt-border)',
      borderRadius: 'var(--lt-radius-lg)',
      padding: 16,
      boxShadow: 'var(--lt-shadow-lg)',
      zIndex: 9999,
      boxSizing: 'border-box' as const,
    };
  };

  return (
    <>
      {/* Badge trigger */}
      <div
        ref={badgeRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      >
        {/* Duration text - visible on hover */}
        {(isHovered || isExpanded) && totalPlayTime > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              fontSize: 8,
              fontWeight: 600,
              color: isPlaying ? 'var(--lt-accent)' : 'var(--lt-fg-tertiary)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 1,
              background: 'var(--lt-bg-elevated)',
              padding: '1px 2px',
              borderRadius: 2,
              lineHeight: 1,
            }}
          >
            {formatDuration(totalPlayTime)}
          </span>
        )}
      </div>

      {/* Popover - portal to body */}
      {isExpanded &&
        createPortal(
          <div ref={popoverRef} style={getPopoverStyle()}>
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: 'var(--lt-font-size-md)',
                fontWeight: 600,
                color: 'var(--lt-fg-primary)',
              }}
            >
              Session Stats
            </h3>

            {/* Main stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 'var(--lt-font-size-xs)',
                    color: 'var(--lt-fg-tertiary)',
                    marginBottom: 2,
                  }}
                >
                  Total Time
                </div>
                <div
                  style={{
                    fontSize: 'var(--lt-font-size-lg)',
                    fontWeight: 600,
                    color: 'var(--lt-fg-primary)',
                  }}
                >
                  {formatDuration(totalPlayTime)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 'var(--lt-font-size-xs)',
                    color: 'var(--lt-fg-tertiary)',
                    marginBottom: 2,
                  }}
                >
                  Tracks Played
                </div>
                <div
                  style={{
                    fontSize: 'var(--lt-font-size-lg)',
                    fontWeight: 600,
                    color: 'var(--lt-fg-primary)',
                  }}
                >
                  {tracksCount}
                </div>
              </div>
            </div>

            {/* Top Artists */}
            {topArtists.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 'var(--lt-font-size-xs)',
                    color: 'var(--lt-fg-tertiary)',
                    marginBottom: 6,
                  }}
                >
                  Top Artists
                </div>
                {topArtists.map((artist, i) => (
                  <div
                    key={artist.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      fontSize: 'var(--lt-font-size-sm)',
                    }}
                  >
                    <span style={{ color: 'var(--lt-fg-tertiary)', width: 16 }}>
                      {i + 1}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {artist.name}
                    </span>
                    <span
                      style={{
                        color: 'var(--lt-fg-tertiary)',
                        fontSize: 'var(--lt-font-size-xs)',
                      }}
                    >
                      {artist.count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Top Genres - placeholder for v2 */}
            <div>
              <div
                style={{
                  fontSize: 'var(--lt-font-size-xs)',
                  color: 'var(--lt-fg-tertiary)',
                  marginBottom: 6,
                }}
              >
                Top Genres
              </div>
              <div
                style={{
                  fontSize: 'var(--lt-font-size-xs)',
                  color: 'var(--lt-fg-tertiary)',
                  fontStyle: 'italic',
                }}
              >
                Genre data requires artist IDs (coming in v2)
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
