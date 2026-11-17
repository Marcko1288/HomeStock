/** Controllo segmentato stile iOS. options: [{ value, label }] */
export function Segmented({ options, value, onChange, label, size }) {
  return (
    <div className={`segmented ${size ? `segmented--${size}` : ""}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`segmented__item ${value === o.value ? "is-active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
