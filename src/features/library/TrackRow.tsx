import { useCallback } from 'react';
import { useContextMenuStore } from '../contextmenu/contextMenuStore';
import { TrackMenuButton } from '../contextmenu/TrackMenuButton';
import { formatDuration } from '../../lib/utils';
import { useTrackSaved } from '../../lib/queries/useTrackSaved';
import type { SpotifyTrack } from '../../lib/types';
import type { PlayContext } from '../../playback/engine';

interface TrackRowProps {
  track: SpotifyTrack;
  index: number;
  /** URI list for queue-based playback (Liked Songs, artist top tracks). */
  queueUris?: string[];
  /** Context URI for context-based playback (playlist, album). */
  contextUri?: string;
  onPlay: (uri: string, context: PlayContext) => void;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function TrackRow({
  track,
  index,
  queueUris,
  contextUri,
  onPlay,
  onNavigate,
}: TrackRowProps) {
  const openContextMenu = useContextMenuStore((s) => s.openMenu);
  const { isSaved, toggle, toggling } = useTrackSaved(track.uri!);

  const handleSave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!toggling) toggle();
    },
    [toggle, toggling],
  );

  const playContext: PlayContext = contextUri
    ? { contextUri, offsetUri: track.uri! }
    : { uris: queueUris, offsetUri: track.uri! };

  return (
    <tr
      className="track-row"
      onClick={() => onPlay(track.uri!, playContext)}
      onContextMenu={(e) => {
        e.preventDefault();
        openContextMenu(e.clientX, e.clientY, {
          kind: 'track',
          track,
          contextUri,
          queueUris,
        });
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay(track.uri!, playContext);
      }}
    >
      <td className="track-number">
        <span className="track-number-static">{index + 1}</span>
        <span className="track-number-play">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        </span>
      </td>
      <td>
        <div className="track-info">
          <div className="track-name">
            {track.explicit && <span className="track-explicit">E</span>}
            {track.name || 'Unknown track'}
          </div>
          <div className="track-artist">
            {track.artists && track.artists.length > 0 ? (
              track.artists.map((a, i) => (
                <span key={a.id!}>
                  {i > 0 && ', '}
                  <button
                    className="track-artist-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('artist', { id: a.id! });
                    }}
                  >
                    {a.name}
                  </button>
                </span>
              ))
            ) : (
              <span className="track-artist-link">Unknown artist</span>
            )}
          </div>
        </div>
      </td>
      <td>
        {track.album && (
          <button
            className="track-album"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('album', { id: track.album!.id! });
            }}
          >
            {track.album.name}
          </button>
        )}
      </td>
      <td className="track-duration">
        <span className="track-duration-text">
          {formatDuration(track.duration_ms ?? 0)}
        </span>
        <button
          className={`track-save-btn${isSaved ? ' saved' : ''}`}
          onClick={handleSave}
          disabled={toggling}
          aria-label={
            isSaved ? 'Remove from Liked Songs' : 'Save to Liked Songs'
          }
        >
          {isSaved ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          )}
        </button>
        <TrackMenuButton
          track={track}
          contextUri={contextUri}
          queueUris={queueUris}
        />
      </td>
    </tr>
  );
}
