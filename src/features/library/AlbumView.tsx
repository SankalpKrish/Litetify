import { useAlbum } from '../../lib/queries/useAlbum';
import {
  getImage,
  formatDuration,
  formatTotalDuration,
  pluralize,
} from '../../lib/utils';
import { usePlayerStore } from '../player/playerStore';
import { useContextMenuStore } from '../contextmenu/contextMenuStore';
import { TrackMenuButton } from '../contextmenu/TrackMenuButton';
import { TrackArt } from './TrackArt';
import { ViewAsMenu } from './ViewAsMenu';
import { useViewModeStore } from './viewModeStore';

interface AlbumViewProps {
  albumId: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function AlbumView({ albumId, onNavigate }: AlbumViewProps) {
  const { data: album, isLoading, error } = useAlbum(albumId);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const openContextMenu = useContextMenuStore((s) => s.openMenu);
  const viewMode = useViewModeStore((s) => s.mode);

  if (isLoading) {
    return (
      <div style={{ opacity: 0, pointerEvents: 'none' }} aria-hidden={true}>
        <div className="detail-header">
          <div className="detail-image" style={{ background: 'transparent' }} />
          <div className="detail-meta" style={{ flex: 1 }}>
            <div style={{ height: 14, marginBottom: 4 }} />
            <div style={{ height: 22, width: '50%' }} />
          </div>
        </div>
        <div className="detail-action-bar">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'transparent',
            }}
          />
        </div>
        <table className="track-table" style={{ opacity: 0 }}>
          <thead>
            <tr className="track-head-row">
              <th className="th-number">#</th>
              <th className="th-title">Title</th>
              <th className="th-duration">&nbsp;</th>
            </tr>
          </thead>
          <tbody>{/* height reserved by table structure */}</tbody>
        </table>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Album not found</div>
        <div className="empty-state-desc">This album may not be available.</div>
      </div>
    );
  }

  const totalDuration = (album.tracks?.items ?? []).reduce(
    (sum, t) => sum + (t.duration_ms ?? 0),
    0,
  );

  return (
    <div>
      <div className="detail-header">
        <img
          className="detail-image"
          src={getImage(album.images ?? null, 256)}
          alt={album.name ?? ''}
        />
        <div className="detail-meta">
          <div className="detail-type">Album</div>
          <h1 className="detail-name">{album.name ?? ''}</h1>
          <div className="detail-desc">
            {(album.artists ?? []).map((a, i) => (
              <span key={a.id ?? ''}>
                {i > 0 && ', '}
                <button
                  className="track-artist-link"
                  onClick={() => onNavigate('artist', { id: a.id! })}
                >
                  {a.name ?? ''}
                </button>
              </span>
            ))}
          </div>
          <div className="detail-stats">
            <strong>{album.release_date?.split('-')[0] ?? ''}</strong>
            {' · '}
            {album.total_tracks ?? 0}{' '}
            {pluralize(album.total_tracks ?? 0, 'song')}
            {totalDuration > 0 && (
              <>
                {', '}
                {formatTotalDuration(totalDuration)}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="detail-action-bar">
        <button
          className="play-btn"
          onClick={() => {
            const first = album.tracks?.items?.[0];
            if (first)
              playTrack(first.uri!, {
                contextUri: album.uri || `spotify:album:${albumId}`,
                offsetUri: first.uri!,
              });
          }}
          aria-label="Play"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        </button>
        <button
          className="detail-menu-btn"
          aria-label={`More options for ${album.name ?? ''}`}
          title="More options"
          onClick={(e) => {
            const rect = (
              e.currentTarget as HTMLElement
            ).getBoundingClientRect();
            openContextMenu(
              rect.left,
              rect.bottom + 4,
              {
                kind: 'album',
                id: albumId,
                name: album.name ?? '',
                uri: album.uri || `spotify:album:${albumId}`,
                image: getImage(album.images ?? null, 64),
              },
              true,
            );
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="5" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="19" cy="12" r="1.7" />
          </svg>
        </button>
        <div className="detail-action-spacer" />
        <ViewAsMenu />
      </div>

      <table
        className={`track-table track-table-album track-table-${viewMode}`}
      >
        <thead>
          <tr className="track-head-row">
            <th className="th-number">#</th>
            <th className="th-title">Title</th>
            <th className="th-duration" aria-label="Duration">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 14" />
              </svg>
            </th>
          </tr>
        </thead>
        <tbody>
          {(album.tracks?.items ?? []).map((track, idx) => (
            <tr
              key={track.id ?? `local-${idx}-${track.uri ?? ''}`}
              className="track-row"
              onClick={() =>
                playTrack(track.uri!, {
                  contextUri: album.uri || `spotify:album:${albumId}`,
                  offsetUri: track.uri!,
                })
              }
              onContextMenu={(e) => {
                e.preventDefault();
                openContextMenu(e.clientX, e.clientY, {
                  kind: 'track',
                  track,
                  contextUri: album.uri || `spotify:album:${albumId}`,
                });
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  playTrack(track.uri!, {
                    contextUri: album.uri || `spotify:album:${albumId}`,
                    offsetUri: track.uri!,
                  });
              }}
            >
              <td className="track-number">
                <span className="track-number-static">{idx + 1}</span>
                <span className="track-number-play">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <polygon points="8,5 19,12 8,19" />
                  </svg>
                </span>
              </td>
              <td>
                <div className="track-cell">
                  {viewMode === 'list' && (
                    <TrackArt src={getImage(album.images ?? null, 64)} />
                  )}
                  <div className="track-info">
                    <div className="track-name">
                      {track.explicit && (
                        <span className="track-explicit">E</span>
                      )}
                      {track.name}
                    </div>
                    <div className="track-artist">
                      {(track.artists ?? []).length > 0
                        ? (track.artists ?? []).map((a, i) => (
                            <span key={a.id ?? ''}>
                              {i > 0 && ', '}
                              <button
                                className="track-artist-link"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigate('artist', { id: a.id! });
                                }}
                              >
                                {a.name ?? ''}
                              </button>
                            </span>
                          ))
                        : null}
                    </div>
                  </div>
                </div>
              </td>
              <td className="track-duration">
                <span className="track-duration-cell">
                  <span className="track-duration-text">
                    {formatDuration(track.duration_ms ?? 0)}
                  </span>
                  <TrackMenuButton
                    track={track}
                    contextUri={album.uri || `spotify:album:${albumId}`}
                  />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
