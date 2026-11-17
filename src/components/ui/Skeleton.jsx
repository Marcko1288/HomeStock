export function SkeletonList({ rows = 6 }) {
  return (
    <div className="list" aria-busy="true" aria-label="Caricamento">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-row" key={i}>
          <span className="skeleton skeleton--thumb" />
          <span className="skeleton-row__text">
            <span className="skeleton skeleton--line" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
            <span className="skeleton skeleton--line skeleton--short" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards() {
  return (
    <div className="stat-grid" aria-busy="true" aria-label="Caricamento">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="skeleton skeleton--card" />
      ))}
    </div>
  );
}
