import { useState, useCallback } from 'react';
import { usePlaylist } from '../../lib/queries/usePlaylist';
import { usePlaylistTracks } from '../../lib/queries/usePlaylistTracks';
import { apiFollowPlaylist, apiUnfollowPlaylist } from '../../lib/api';
import {
  getImage,
  formatDuration,
  formatDateAdded,
  formatTotalDuration,
  formatNumber,
  pluralize,
} from '../../lib/utils';
import { usePlayerStore } from '../player/playerStore';
import { useContextMenuStore } from '../contextmenu/contextMenuStore';
import { TrackMenuButton } from '../contextmenu/TrackMenuButton';
import { TrackArt } from './TrackArt';
import { ViewAsMenu } from './ViewAsMenu';
import { useViewModeStore } from './viewModeStore';
import type { SpotifyTrack } from '../../lib/types';

interface PlaylistDetailProps {
  playlistId: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function PlaylistDetail({
  playlistId,
  onNavigate,
}: PlaylistDetailProps) {
  const {
    data: playlist,
    isLoading: plLoading,
    error: plError,
  } = usePlaylist(playlistId);
  const {
    items: loadedItems,
    isLoading: trLoading,
    error: trError,
  } = usePlaylistTracks(playlistId);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const openContextMenu = useContextMenuStore((s) => s.openMenu);
  const viewMode = useViewModeStore((s) => s.mode);
  const [followState, setFollowState] = useState<'idle' | 'loading'>('idle');
  const [isFollowing, setIsFollowing] = useState(false);

  const toggleFollow = useCallback(async () => {
    setFollowState('loading');
    try {
      if (isFollowing) {
        await apiUnfollowPlaylist(playlistId);
      } else {
        await apiFollowPlaylist(playlistId);
      }
      setIsFollowing(!isFollowing);
    } catch {
      /* noop */
    }
    setFollowState('idle');
  }, [playlistId, isFollowing]);

  if (plLoading) {
    return (
      <div style={{ opacity: 0, pointerEvents: 'none' }} aria-hidden={true}>
        <div className="detail-header">
          <div className="detail-image" style={{ background: 'transparent' }} />
          <div className="detail-meta" style={{ flex: 1 }}>
            <div style={{ height: 14, marginBottom: 4 }} />
            <div style={{ height: 22, width: '70%' }} />
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
              <th className="th-album">Album</th>
              <th className="th-date">Date added</th>
              <th className="th-duration">&nbsp;</th>
            </tr>
          </thead>
          <tbody>{/* height reserved by table structure */}</tbody>
        </table>
      </div>
    );
  }

  if (plError || !playlist) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Could not load playlist</div>
        <div className="empty-state-desc">
          It may have been removed or you may not have access.
        </div>
      </div>
    );
  }

  const trackItems = (
    loadedItems.length ? loadedItems : (playlist.tracks?.items ?? [])
  ).filter((item) => item.track);
  const totalMs = trackItems.reduce(
    (sum, it) => sum + (it.track?.duration_ms ?? 0),
    0,
  );
  const songCount = playlist.tracks?.total || trackItems.length;
  const savesCount = playlist.followers?.total ?? 0;

  return (
    <div>
      <div className="detail-header">
        <img
          className="detail-image"
          src={getImage(playlist.images ?? null, 256)}
          alt={playlist.name ?? ''}
        />
        <div className="detail-meta">
          <div className="detail-type">
            {playlist.public === false ? 'Private Playlist' : 'Public Playlist'}
          </div>
          <h1 className="detail-name">{playlist.name ?? ''}</h1>
          {playlist.description && (
            <p className="detail-desc">{playlist.description}</p>
          )}
          <div className="detail-stats">
            <strong>{playlist.owner.display_name ?? playlist.owner.id!}</strong>
            {savesCount > 0 && (
              <>
                {' · '}
                {formatNumber(savesCount)} {pluralize(savesCount, 'save')}
              </>
            )}
            {' · '}
            {songCount} {pluralize(songCount, 'song')}
            {totalMs > 0 && (
              <>
                {', '}
                {formatTotalDuration(totalMs)}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="detail-action-bar">
        <button
          className="play-btn"
          onClick={() => {
            const first = trackItems[0]?.track;
            if (first)
              playTrack(first.uri!, {
                contextUri: `spotify:playlist:${playlistId}`,
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
          className="btn btn-secondary"
          onClick={toggleFollow}
          disabled={followState === 'loading'}
          style={{ marginLeft: 'var(--lt-space-md)' }}
        >
          {isFollowing ? 'Unfollow' : 'Follow'}
        </button>
        <button
          className="detail-menu-btn"
          aria-label={`More options for ${playlist.name ?? ''}`}
          title="More options"
          onClick={(e) => {
            const rect = (
              e.currentTarget as HTMLElement
            ).getBoundingClientRect();
            openContextMenu(
              rect.left,
              rect.bottom + 4,
              {
                kind: 'playlist',
                id: playlistId,
                name: playlist.name ?? '',
                uri: `spotify:playlist:${playlistId}`,
                image: getImage(playlist.images ?? null, 64),
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

      {trLoading && loadedItems.length === 0 && (
        <div aria-hidden={true}>
          <table className="track-table" style={{ opacity: 0 }}>
            <thead>
              <tr className="track-head-row">
                <th className="th-number">#</th>
                <th className="th-title">Title</th>
                <th className="th-album">Album</th>
                <th className="th-date">Date added</th>
                <th className="th-duration">&nbsp;</th>
              </tr>
            </thead>
            <tbody>{/* empty — height reserved by table structure */}</tbody>
          </table>
        </div>
      )}

      {trError && trackItems.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">Could not load all tracks</div>
          <div className="empty-state-desc">
            {trError instanceof Error
              ? trError.message
              : 'Some tracks may not be displayed. Try again later.'}
          </div>
        </div>
      )}

      {trError && trackItems.length > 0 && (
        <div
          className="empty-state"
          style={{
            padding: 'var(--lt-space-md)',
            marginBottom: 'var(--lt-space-lg)',
          }}
        >
          <div className="empty-state-desc">
            {trError instanceof Error
              ? trError.message
              : 'Some tracks could not be loaded. Showing cached tracks.'}
          </div>
        </div>
      )}

      {trackItems.length > 0 && (
        <table className={`track-table track-table-${viewMode}`}>
          <thead>
            <tr className="track-head-row">
              <th className="th-number">#</th>
              <th className="th-title">Title</th>
              <th className="th-album">Album</th>
              <th className="th-date">Date added</th>
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
            {trackItems.map((item, idx) => {
              const track = item.track!;
              return (
                <tr
                  key={track.id ?? `local-${idx}-${track.uri ?? ''}`}
                  className="track-row"
                  onClick={() =>
                    playTrack(track.uri!, {
                      contextUri: `spotify:playlist:${playlistId}`,
                      offsetUri: track.uri!,
                    })
                  }
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openContextMenu(e.clientX, e.clientY, {
                      kind: 'track',
                      track: track as SpotifyTrack,
                      contextUri: `spotify:playlist:${playlistId}`,
                    });
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')
                      playTrack(track.uri!, {
                        contextUri: `spotify:playlist:${playlistId}`,
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
                        <TrackArt
                          src={getImage(track.album?.images ?? null, 64)}
                        />
                      )}
                      <div className="track-info">
                        <div className="track-name">
                          {track.explicit && (
                            <span className="track-explicit">E</span>
                          )}
                          {track.name || 'Unknown track'}
                        </div>
                        <div className="track-artist">
                          {(track.artists ?? []).length > 0 ? (
                            (track.artists ?? []).map((a, i) => (
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
                          ) : (
                            <span className="track-artist-link">
                              Unknown artist
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="td-album">
                    {track.album && (
                      <button
                        className="track-album"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('album', { id: track.album!.id! });
                        }}
                      >
                        {track.album.name ?? ''}
                      </button>
                    )}
                  </td>
                  <td className="td-date">
                    {formatDateAdded(item.added_at ?? '')}
                  </td>
                  <td className="track-duration">
                    <span className="track-duration-cell">
                      <span className="track-duration-text">
                        {formatDuration(track.duration_ms ?? 0)}
                      </span>
                      <TrackMenuButton
                        track={track as SpotifyTrack}
                        contextUri={`spotify:playlist:${playlistId}`}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
