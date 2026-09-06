/**
 * Playback Timer - Session Stats
 * Tracks listening time, tracks played, artists, and genres for the current session
 */

export interface SessionStats {
  startTime: number;
  totalPlayTime: number; // ms
  tracksPlayed: string[]; // unique track URIs
  trackNames: Map<string, string>; // uri -> name
  artistCounts: Map<string, number>; // artist name -> play count
  genreCounts: Map<string, number>; // genre -> count
  artistGenres: Map<string, string[]>; // artist name -> genres
}

const sessionStats: SessionStats = createEmptyStats();

function createEmptyStats(): SessionStats {
  return {
    startTime: Date.now(),
    totalPlayTime: 0,
    tracksPlayed: [],
    trackNames: new Map(),
    artistCounts: new Map(),
    genreCounts: new Map(),
    artistGenres: new Map(),
  };
}

export function getSessionStats(): SessionStats {
  return sessionStats;
}

export function updatePlayTime(deltaMs: number): void {
  sessionStats.totalPlayTime += deltaMs;
}

export function trackPlay(
  trackUri: string,
  trackName: string,
  artistNames: string[],
): void {
  // Add to tracks played (unique)
  if (!sessionStats.tracksPlayed.includes(trackUri)) {
    sessionStats.tracksPlayed.push(trackUri);
    sessionStats.trackNames.set(trackUri, trackName);
  }

  // Update artist counts
  artistNames.forEach((artist) => {
    const count = sessionStats.artistCounts.get(artist) || 0;
    sessionStats.artistCounts.set(artist, count + 1);
  });
}

export function getTopArtists(limit = 5): { name: string; count: number }[] {
  return Array.from(sessionStats.artistCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function getTopGenres(limit = 5): { name: string; count: number }[] {
  return Array.from(sessionStats.genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
