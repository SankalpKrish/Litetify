export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export function getImage(
  images:
    | { url?: string | null; width?: number | null; height?: number | null }[]
    | null
    | undefined,
  size?: number,
): string {
  if (!images || images.length === 0) return '';
  if (size) {
    const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    const best =
      sorted.find((i) => i.width != null && i.width >= size) ?? sorted[0];
    return best?.url ?? '';
  }
  return images[0]?.url ?? '';
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/** Spotify-style total duration summary, e.g. "about 5 hr", "1 hr 23 min", "47 min". */
export function formatTotalDuration(totalMs: number): string {
  const totalMinutes = Math.round(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) {
    if (minutes === 0) return `about ${hours} hr`;
    return `${hours} hr ${minutes} min`;
  }
  return `${totalMinutes} min`;
}

/** "Date added" style, e.g. "28 Jan 2024". */
export function formatDateAdded(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
