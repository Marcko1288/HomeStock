export function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={`chip ${active ? "is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ChipRow({ label, children }) {
  return (
    <div className="chip-row" role="group" aria-label={label}>
      {children}
    </div>
  );
}
