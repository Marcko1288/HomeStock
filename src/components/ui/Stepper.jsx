import { Minus, Plus } from "lucide-react";
import { formatQty } from "../../utils/format.js";

/** Stepper – / + sempre visibile. Touch target 44pt. */
export function Stepper({ value, unit, onChange, min = 0, step = 1, label, size = "md" }) {
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 1000) / 1000));
  const inc = () => onChange(Math.round((value + step) * 1000) / 1000);
  return (
    <div className={`stepper stepper--${size}`} role="group" aria-label={label ? `Quantità di ${label}` : "Quantità"}>
      <button
        type="button"
        className="stepper__btn"
        onClick={dec}
        disabled={value <= min}
        aria-label={label ? `Togli 1 a ${label}` : "Diminuisci"}
      >
        <Minus aria-hidden="true" />
      </button>
      <span className="stepper__value" aria-live="polite">
        <b>{formatQty(value)}</b>
        {unit && <small>{unit}</small>}
      </span>
      <button type="button" className="stepper__btn" onClick={inc} aria-label={label ? `Aggiungi 1 a ${label}` : "Aumenta"}>
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}
