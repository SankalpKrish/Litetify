/** Small album-art thumbnail shown beside a track name in list view. */
export function TrackArt({ src }: { src: string }) {
  if (!src) {
    return (
      <span className="track-art track-art-fallback" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </span>
    );
  }
  return (
    <img
      className="track-art"
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
    />
  );
}
