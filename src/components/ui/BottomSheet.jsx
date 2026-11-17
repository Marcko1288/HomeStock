import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

let openSheets = 0;

/**
 * Pannello dal basso in stile iOS. Si chiude con la X, toccando lo sfondo, con Esc
 * o trascinando verso il basso la maniglia.
 */
export function BottomSheet({ open = true, onClose, title, children, footer, size = "auto", labelledBy }) {
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const panel = useRef(null);
  const drag = useRef(null);
  const titleId = useId();
  const restoreFocus = useRef(null);

  const requestClose = () => {
    if (closing) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return onClose?.();
    setClosing(true);
    setTimeout(() => onClose?.(), 180);
  };

  useEffect(() => {
    if (!open) return undefined;
    restoreFocus.current = document.activeElement;
    openSheets += 1;
    document.documentElement.classList.add("sheet-open");
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    // Focus sul pannello (non sul primo input, per non aprire subito la tastiera).
    panel.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      openSheets -= 1;
      if (openSheets === 0) document.documentElement.classList.remove("sheet-open");
      restoreFocus.current?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const onPointerDown = (e) => {
    if (e.target.closest("button")) return; // la X deve ricevere il suo click
    drag.current = { y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setDragY(Math.max(0, e.clientY - drag.current.y));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    if (dragY > 90) requestClose();
    setDragY(0);
  };

  return createPortal(
    <div className={`sheet-root ${closing ? "is-closing" : ""}`}>
      <div className="sheet-backdrop" onClick={requestClose} aria-hidden="true" />
      <div
        ref={panel}
        className={`sheet sheet--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? titleId : undefined)}
        tabIndex={-1}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
      >
        <div
          className="sheet__grab"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="sheet__handle" />
          {title !== undefined && (
            <div className="sheet__header">
              <h2 id={titleId} className="sheet__title">
                {title}
              </h2>
              <button type="button" className="icon-btn icon-btn--filled" onClick={requestClose} aria-label="Chiudi">
                <X aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Conferma per le azioni distruttive non annullabili (al posto di window.confirm). */
export function ConfirmSheet({ title, message, confirmLabel, destructive = true, onConfirm, onClose }) {
  return (
    <BottomSheet title={title} onClose={onClose}>
      {message && <p className="sheet__text">{message}</p>}
      <div className="stack-8">
        <button
          type="button"
          className={`btn btn--block ${destructive ? "btn--danger" : "btn--primary"}`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn btn--block btn--plain" onClick={onClose}>
          Annulla
        </button>
      </div>
    </BottomSheet>
  );
}
