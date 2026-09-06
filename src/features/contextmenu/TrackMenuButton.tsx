import { useContextMenuStore } from './contextMenuStore';
import type { SpotifyTrack } from '../../lib/types';

interface TrackMenuButtonProps {
  track: SpotifyTrack;
  contextUri?: string;
  queueUris?: string[];
}

/** The hover "⋯" button on a track row; opens the shared context menu anchored
 *  to the button (Spotify-style). */
export function TrackMenuButton({
  track,
  contextUri,
  queueUris,
}: TrackMenuButtonProps) {
  const openMenu = useContextMenuStore((s) => s.openMenu);

  return (
    <button
      className="track-menu-btn"
      aria-label={`More options for ${track.name}`}
      title="More options"
      onClick={(e) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        openMenu(
          rect.left,
          rect.bottom + 4,
          { kind: 'track', track, contextUri, queueUris },
          true,
        );
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <circle cx="5" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="19" cy="12" r="1.6" />
      </svg>
    </button>
  );
}
