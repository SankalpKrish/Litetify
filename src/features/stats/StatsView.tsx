import { useQuery } from '@tanstack/react-query';
import {
  apiGetTopArtists,
  apiGetTopTracks,
  apiGetRecentlyPlayed,
} from '../../lib/api';
import {
  getSessionStats,
  getTopArtists as getSessionTopArtists,
  getTopGenres as getSessionTopGenres,
  formatDuration,
} from '../player/playbackTimer';

interface StatsViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

const s = {
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 'var(--lt-space-lg)',
  } as const,
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 'var(--lt-space-lg)',
  } as const,
  statCard: {
    background: 'var(--lt-bg-elevated)',
    borderRadius: 'var(--lt-radius-lg)',
    padding: 'var(--lt-space-xl)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--lt-space-sm)',
  } as const,
  statLabel: {
    fontSize: 'var(--lt-font-size-sm)',
    color: 'var(--lt-fg-secondary)',
    fontWeight: 'var(--lt-font-weight-medium)',
  } as const,
  statValue: {
    fontSize: 'var(--lt-font-size-2xl)',
    fontWeight: 'var(--lt-font-weight-bold)',
    letterSpacing: '-0.03em',
    color: 'var(--lt-fg-primary)',
  } as const,
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--lt-space-sm) 0',
    borderBottom: '1px solid var(--lt-border)',
    fontSize: 'var(--lt-font-size-base)',
    color: 'var(--lt-fg-primary)',
  } as const,
  rowName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  rowCount: {
    color: 'var(--lt-fg-secondary)',
    fontSize: 'var(--lt-font-size-sm)',
    marginLeft: 'var(--lt-space-md)',
    whiteSpace: 'nowrap',
  } as const,
  trackRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--lt-space-md)',
    padding: 'var(--lt-space-sm) 0',
    borderBottom: '1px solid var(--lt-border)',
    cursor: 'pointer',
  } as const,
  trackImg: {
    width: 40,
    height: 40,
    borderRadius: 'var(--lt-radius-sm)',
    objectFit: 'cover' as const,
    background: 'var(--lt-surface-elevated)',
    flexShrink: 0,
  } as const,
  trackInfo: {
    flex: 1,
    minWidth: 0,
  } as const,
  trackName: {
    fontSize: 'var(--lt-font-size-base)',
    fontWeight: 'var(--lt-font-weight-medium)',
    color: 'var(--lt-fg-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as const,
  trackArtist: {
    fontSize: 'var(--lt-font-size-sm)',
    color: 'var(--lt-fg-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as const,
  artistCard: {
    background: 'var(--lt-bg-elevated)',
    borderRadius: 'var(--lt-radius-lg)',
    padding: 'var(--lt-space-lg)',
    cursor: 'pointer',
    transition: 'background var(--lt-transition-fast)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--lt-space-sm)',
    textAlign: 'center' as const,
  } as const,
  artistImg: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    objectFit: 'cover' as const,
    background: 'var(--lt-surface-elevated)',
  } as const,
  artistName: {
    fontSize: 'var(--lt-font-size-base)',
    fontWeight: 'var(--lt-font-weight-semibold)',
    color: 'var(--lt-fg-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: '100%',
  } as const,
  section: {
    marginBottom: 'var(--lt-space-2xl)',
  } as const,
};

function emptyImg() {
  return (
    <div
      style={{
        ...s.artistImg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--lt-fg-tertiary)',
        fontSize: 24,
        fontWeight: 'var(--lt-font-weight-bold)',
      }}
    >
      ?
    </div>
  );
}

function ArtistCard({
  artist,
  onNavigate,
}: {
  artist: { id: string; name: string; images?: { url: string }[] };
  onNavigate: StatsViewProps['onNavigate'];
}) {
  const img = artist.images?.[0]?.url;
  return (
    <div
      style={s.artistCard}
      onClick={() => onNavigate('artist', { id: artist.id })}
    >
      {img ? (
        <img src={img} alt={artist.name} style={s.artistImg} loading="lazy" />
      ) : (
        emptyImg()
      )}
      <div style={s.artistName}>{artist.name}</div>
    </div>
  );
}

export function StatsView({ onNavigate }: StatsViewProps) {
  const sessionStats = getSessionStats();
  const sessionArtists = getSessionTopArtists(5);
  const sessionGenres = getSessionTopGenres(5);

  const { data: topArtists } = useQuery({
    queryKey: ['stats', 'topArtists'],
    queryFn: () => apiGetTopArtists(10),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: topTracks } = useQuery({
    queryKey: ['stats', 'topTracks'],
    queryFn: () => apiGetTopTracks(10),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: recentlyPlayed } = useQuery({
    queryKey: ['stats', 'recentlyPlayed'],
    queryFn: () => apiGetRecentlyPlayed(10),
    staleTime: 60 * 1000,
    retry: 1,
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Stats Dashboard</h1>
      </div>

      {/* Session stats */}
      <section style={s.section}>
        <div className="section-header">
          <h2 className="section-title">This Session</h2>
        </div>
        <div style={s.grid2}>
          <div style={s.statCard}>
            <span style={s.statLabel}>Listening Time</span>
            <span style={s.statValue}>
              {sessionStats.startTime
                ? formatDuration(sessionStats.totalPlayTime)
                : '0m'}
            </span>
          </div>
          <div style={s.statCard}>
            <span style={s.statLabel}>Tracks Played</span>
            <span style={s.statValue}>{sessionStats.tracksPlayed.length}</span>
          </div>
        </div>

        {sessionArtists.length > 0 && (
          <div style={{ marginTop: 'var(--lt-space-lg)' }}>
            <div style={{ ...s.statLabel, marginBottom: 'var(--lt-space-sm)' }}>
              Top Artists
            </div>
            {sessionArtists.map((a) => (
              <div key={a.name} style={s.row}>
                <span style={s.rowName}>{a.name}</span>
                <span style={s.rowCount}>
                  {a.count} play{a.count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {sessionGenres.length > 0 && (
          <div style={{ marginTop: 'var(--lt-space-lg)' }}>
            <div style={{ ...s.statLabel, marginBottom: 'var(--lt-space-sm)' }}>
              Top Genres
            </div>
            {sessionGenres.map((g) => (
              <div key={g.name} style={s.row}>
                <span style={s.rowName}>{g.name}</span>
                <span style={s.rowCount}>{g.count}</span>
              </div>
            ))}
          </div>
        )}

        {sessionStats.tracksPlayed.length === 0 && (
          <p
            style={{
              color: 'var(--lt-fg-secondary)',
              fontSize: 'var(--lt-font-size-sm)',
            }}
          >
            No listening activity this session yet.
          </p>
        )}
      </section>

      {/* All-time top artists */}
      {topArtists && topArtists.items.length > 0 && (
        <section style={s.section}>
          <div className="section-header">
            <h2 className="section-title">Top Artists (All Time)</h2>
          </div>
          <div style={s.grid3}>
            {topArtists.items.map((a) => (
              <ArtistCard
                key={a.id}
                artist={
                  a as { id: string; name: string; images?: { url: string }[] }
                }
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      )}

      {/* All-time top tracks */}
      {topTracks && topTracks.items.length > 0 && (
        <section style={s.section}>
          <div className="section-header">
            <h2 className="section-title">Top Tracks (All Time)</h2>
          </div>
          {topTracks.items.map((t) => {
            const img = t.album?.images?.[0]?.url;
            return (
              <div
                key={t.uri}
                style={s.trackRow}
                onClick={() => onNavigate('album', { id: t.album?.id ?? '' })}
              >
                {img ? (
                  <img src={img} alt="" style={s.trackImg} loading="lazy" />
                ) : (
                  <div
                    style={{
                      ...s.trackImg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--lt-fg-tertiary)',
                      fontSize: 16,
                    }}
                  >
                    ♪
                  </div>
                )}
                <div style={s.trackInfo}>
                  <div style={s.trackName}>{t.name}</div>
                  <div style={s.trackArtist}>
                    {(t.artists ?? []).map((a) => a.name).join(', ')}
                  </div>
                </div>
                <span style={{ ...s.rowCount, alignSelf: 'center' }}>
                  {formatDuration(t.duration_ms!)}
                </span>
              </div>
            );
          })}
        </section>
      )}

      {/* Recently played */}
      {recentlyPlayed && recentlyPlayed.items.length > 0 && (
        <section style={s.section}>
          <div className="section-header">
            <h2 className="section-title">Recently Played</h2>
          </div>
          {recentlyPlayed.items.map((item) => {
            const t = item.track;
            const img = t.album?.images?.[0]?.url;
            return (
              <div
                key={`${t.uri}-${item.played_at}`}
                style={s.trackRow}
                onClick={() => onNavigate('album', { id: t.album?.id ?? '' })}
              >
                {img ? (
                  <img src={img} alt="" style={s.trackImg} loading="lazy" />
                ) : (
                  <div
                    style={{
                      ...s.trackImg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--lt-fg-tertiary)',
                      fontSize: 16,
                    }}
                  >
                    ♪
                  </div>
                )}
                <div style={s.trackInfo}>
                  <div style={s.trackName}>{t.name}</div>
                  <div style={s.trackArtist}>
                    {(t.artists ?? []).map((a) => a.name).join(', ')}
                  </div>
                </div>
                <span style={{ ...s.rowCount, alignSelf: 'center' }}>
                  {new Date(item.played_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
