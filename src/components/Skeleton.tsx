export function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="card-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card">
          <div className="card-image skeleton-shimmer skeleton-block" />
          <div>
            <div
              className="card-title skeleton-shimmer"
              style={{ height: 14, borderRadius: 4 }}
            >
              &nbsp;
            </div>
            <div
              className="card-subtitle skeleton-shimmer"
              style={{ height: 12, borderRadius: 4, marginTop: 8 }}
            >
              &nbsp;
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
