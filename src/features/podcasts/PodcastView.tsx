import { useShow, useShowEpisodes } from '../../lib/queries/useShows';
import { getImage, formatDuration } from '../../lib/utils';
import { usePlayerStore } from '../player/playerStore';
import { LoadingState, ErrorState } from '../../lib/ViewState';

interface PodcastViewProps {
  showId: string;
  onNavigate?: (view: string, params?: Record<string, string>) => void;
}

export function PodcastView({ showId }: PodcastViewProps) {
  const { data: show, isLoading, error } = useShow(showId);
  const { data: episodes } = useShowEpisodes(showId);
  const playTrack = usePlayerStore((s) => s.playTrack);

  if (isLoading) return <LoadingState message="Loading podcast..." />;
  if (error || !show) return <ErrorState title="Could not load podcast" />;

  return (
    <div>
      <div className="detail-header">
        <img
          className="detail-image"
          src={getImage(show.images, 256)}
          alt={show.name}
        />
        <div className="detail-meta">
          <div className="detail-type">Podcast</div>
          <h1 className="detail-name">{show.name}</h1>
          <p className="detail-desc">{show.description}</p>
          <div className="detail-stats">
            {show.publisher} · {show.total_episodes} episodes
          </div>
        </div>
      </div>

      {episodes && episodes.items.length > 0 && (
        <table className="track-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Episode</th>
              <th style={{ width: 60, textAlign: 'right' }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {episodes.items.map((ep, idx) => (
              <tr
                key={ep.id}
                className="track-row"
                onClick={() =>
                  playTrack(ep.uri, { uris: episodes.items.map((e) => e.uri) })
                }
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    playTrack(ep.uri, {
                      uris: episodes.items.map((e) => e.uri),
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
                      {ep.explicit && <span className="track-explicit">E</span>}
                      {ep.name}
                    </div>
                    <div className="track-artist">
                      {new Date(ep.release_date).toLocaleDateString()}
                    </div>
                  </div>
                </td>
                <td className="track-duration">
                  <span className="track-duration-text">
                    {formatDuration(ep.duration_ms)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
