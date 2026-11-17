import { useRef, useState } from "react";

const THRESHOLD = 96;
const EDGE = 24; // ignora i tocchi dal bordo sinistro (gesto "indietro" di Safari)

/**
 * Riga con swipe orizzontale:
 *  - verso sinistra → `onSwipeLeft` (es. Elimina)
 *  - verso destra   → `onSwipeRight` (es. Aggiungi alla spesa)
 * I pulsanti all'interno (stepper) non avviano lo swipe. Le stesse azioni sono sempre
 * disponibili anche nel dettaglio, per chi non usa i gesti.
 */
export function SwipeRow({ children, leftAction, rightAction, onSwipeLeft, onSwipeRight }) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const g = useRef(null);
  const suppressClick = useRef(false);

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest("button, input, select, textarea")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < EDGE && e.pointerType !== "mouse") return;
    g.current = { x: e.clientX, y: e.clientY, id: e.pointerId, mode: null };
    setAnimating(false);
  };

  const onPointerMove = (e) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.mode) {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
      s.mode = Math.abs(mx) > Math.abs(my) * 1.2 ? "h" : "v";
      if (s.mode === "h") e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (s.mode !== "h") return;
    let x = mx;
    if (x < 0 && !onSwipeLeft) x = 0;
    if (x > 0 && !onSwipeRight) x = 0;
    // Resistenza oltre la soglia
    const abs = Math.abs(x);
    if (abs > THRESHOLD) x = Math.sign(x) * (THRESHOLD + (abs - THRESHOLD) * 0.35);
    setDx(x);
  };

  const end = () => {
    const s = g.current;
    g.current = null;
    if (!s || s.mode !== "h") return;
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 50);
    setAnimating(true);
    if (dx <= -THRESHOLD) onSwipeLeft?.();
    else if (dx >= THRESHOLD) onSwipeRight?.();
    setDx(0);
  };

  const armed = Math.abs(dx) >= THRESHOLD;

  return (
    <div className="swipe">
      {dx > 0 && rightAction && (
        <div className={`swipe__bg swipe__bg--right swipe__bg--${rightAction.tone} ${armed ? "is-armed" : ""}`} aria-hidden="true">
          {rightAction.icon}
          <span>{rightAction.label}</span>
        </div>
      )}
      {dx < 0 && leftAction && (
        <div className={`swipe__bg swipe__bg--left swipe__bg--${leftAction.tone} ${armed ? "is-armed" : ""}`} aria-hidden="true">
          <span>{leftAction.label}</span>
          {leftAction.icon}
        </div>
      )}
      <div
        className={`swipe__content ${animating ? "is-animating" : ""}`}
        style={dx ? { transform: `translate3d(${dx}px,0,0)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
