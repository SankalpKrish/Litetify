import { useSavedShows } from '../../lib/queries/useShows';
import { getImage } from '../../lib/utils';
import { LoadingState, ErrorState } from '../../lib/ViewState';

interface PodcastListProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function PodcastList({ onNavigate }: PodcastListProps) {
  const { data, isLoading, error } = useSavedShows(50);

  if (isLoading) return <LoadingState message="Loading podcasts..." />;
  if (error) return <ErrorState title="Could not load podcasts" />;
  if (!data || data.items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No podcasts yet</div>
        <div className="empty-state-desc">
          Follow a podcast on Spotify and it will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="card-grid">
      {data.items.map((show) => (
        <div
          key={show.id}
          className="card"
          onClick={() => onNavigate('podcast', { id: show.id })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('podcast', { id: show.id });
            }
          }}
        >
          <img
            className="card-image"
            src={getImage(show.images)}
            alt={show.name}
            loading="lazy"
          />
          <div>
            <div className="card-title">{show.name}</div>
            <div className="card-subtitle">{show.publisher}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
