import {
  useArtist,
  useArtistTopTracks,
  useArtistAlbums,
  useIsFollowingArtist,
  useFollowArtist,
  useRelatedArtists,
} from '../../lib/queries/useArtist';
import { getImage, formatDuration } from '../../lib/utils';
import { usePlayerStore } from '../player/playerStore';
import { useContextMenuStore } from '../contextmenu/contextMenuStore';
import { TrackMenuButton } from '../contextmenu/TrackMenuButton';

interface ArtistViewProps {
  artistId: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function ArtistView({ artistId, onNavigate }: ArtistViewProps) {
  const { data: artist, isLoading, error } = useArtist(artistId);
  const { data: topTracks } = useArtistTopTracks(artistId);
  const { data: albums } = useArtistAlbums(artistId, 10);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const openContextMenu = useContextMenuStore((s) => s.openMenu);
  const { data: following } = useIsFollowingArtist(artistId);
  const followMut = useFollowArtist();
  const { data: relatedArtists } = useRelatedArtists(artistId);

  if (isLoading) {
    return (
      <div style={{ opacity: 0, pointerEvents: 'none' }} aria-hidden={true}>
        <div className="detail-header">
          <div
            className="detail-image detail-image-round"
            style={{ background: 'transparent' }}
          />
          <div className="detail-meta" style={{ flex: 1 }}>
            <div style={{ height: 14, marginBottom: 4 }} />
            <div style={{ height: 22, width: '40%' }} />
          </div>
        </div>
        <div
          className="section-header"
          style={{ marginTop: 'var(--lt-space-2xl)' }}
        >
          <h2 className="section-title">Popular</h2>
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
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Title</th>
              <th style={{ width: 60, textAlign: 'right' }}>Duration</th>
            </tr>
          </thead>
          <tbody>{/* empty — height reserved by table structure */}</tbody>
        </table>
        <div
          className="section-header"
          style={{ marginTop: 'var(--lt-space-2xl)' }}
        >
          <h2 className="section-title">Albums</h2>
        </div>
        <div className="card-grid">
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="card" style={{ background: 'transparent' }}>
              <div
                className="card-image"
                style={{ background: 'transparent' }}
              />
            </div>
          ))}
        </div>
        <div
          className="section-header"
          style={{ marginTop: 'var(--lt-space-2xl)' }}
        >
          <h2 className="section-title">Fans Also Like</h2>
        </div>
        <div className="card-grid">
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="card" style={{ background: 'transparent' }}>
              <div
                className="card-image card-image-round"
                style={{ background: 'transparent' }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Artist not found</div>
        <div className="empty-state-desc">
          This artist may not be available.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="detail-header">
        <img
          className="detail-image detail-image-round"
          src={getImage(artist.images ?? null, 256)}
          alt={artist.name ?? ''}
        />
        <div className="detail-meta">
          <div className="detail-type">Artist</div>
          <h1 className="detail-name">{artist.name ?? ''}</h1>
          {artist.followers && (
            <div className="detail-stats">
              {artist.followers.total.toLocaleString()} followers
            </div>
          )}
        </div>
      </div>

      {topTracks && topTracks.tracks.length > 0 && (
        <>
          <div className="section-header">
            <h2 className="section-title">Popular</h2>
          </div>

          <div className="detail-action-bar">
            <button
              className="play-btn"
              onClick={() => {
                const queue = topTracks.tracks
                  .map((t) => t.uri)
                  .filter((u): u is string => !!u);
                const first = topTracks.tracks[0];
                if (first)
                  playTrack(first.uri!, { uris: queue, offsetUri: first.uri! });
              }}
              aria-label="Play"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="8,5 19,12 8,19" />
              </svg>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => followMut.mutate({ artistId, follow: !following })}
              disabled={followMut.isPending}
              style={{ marginLeft: 'var(--lt-space-md)' }}
            >
              {following ? 'Unfollow' : 'Follow'}
            </button>
          </div>

          <table className="track-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>#</th>
                <th>Title</th>
                <th style={{ width: 60, textAlign: 'right' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {topTracks.tracks.map((track, idx) => {
                const queue = topTracks.tracks
                  .map((t) => t.uri)
                  .filter((u): u is string => !!u);
                return (
                  <tr
                    key={track.id ?? `local-${idx}-${track.uri ?? ''}`}
                    className="track-row"
                    onClick={() =>
                      playTrack(track.uri!, {
                        uris: queue,
                        offsetUri: track.uri!,
                      })
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openContextMenu(e.clientX, e.clientY, {
                        kind: 'track',
                        track,
                        queueUris: queue,
                      });
                    }}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')
                        playTrack(track.uri!, {
                          uris: queue,
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
                      <div className="track-info">
                        <div className="track-name">
                          {track.explicit && (
                            <span className="track-explicit">E</span>
                          )}
                          {track.name ?? ''}
                        </div>
                      </div>
                    </td>
                    <td className="track-duration">
                      <span className="track-duration-text">
                        {formatDuration(track.duration_ms ?? 0)}
                      </span>
                      <TrackMenuButton track={track} queueUris={queue} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {albums && albums.items.length > 0 && (
        <>
          <div
            className="section-header"
            style={{ marginTop: 'var(--lt-space-2xl)' }}
          >
            <h2 className="section-title">Albums</h2>
          </div>
          <div className="card-grid">
            {albums.items.map((album) => (
              <div
                key={album.id!}
                className="card"
                onClick={() => onNavigate('album', { id: album.id! })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate('album', { id: album.id! });
                  }
                }}
              >
                <img
                  className="card-image"
                  src={getImage(album.images ?? null)}
                  alt={album.name ?? ''}
                  loading="lazy"
                />
                <div>
                  <div className="card-title">{album.name ?? ''}</div>
                  {album.release_date && (
                    <div className="card-subtitle">
                      {album.release_date.split('-')[0]}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {relatedArtists && relatedArtists.artists.length > 0 && (
        <>
          <div
            className="section-header"
            style={{ marginTop: 'var(--lt-space-2xl)' }}
          >
            <h2 className="section-title">Fans Also Like</h2>
          </div>
          <div className="card-grid">
            {relatedArtists.artists.slice(0, 12).map((artist) => (
              <div
                key={artist.id!}
                className="card"
                onClick={() => onNavigate('artist', { id: artist.id! })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate('artist', { id: artist.id! });
                  }
                }}
              >
                <img
                  className="card-image card-image-round"
                  src={getImage(artist.images ?? null)}
                  alt={artist.name ?? ''}
                  loading="lazy"
                />
                <div>
                  <div className="card-title">{artist.name ?? ''}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
