import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "../components/ui/Toast.jsx";
import { UNDO_MS } from "../utils/constants.js";

const ToastContext = createContext(null);

/**
 * toast.show({ message, tone, action: { label, onClick }, duration, onExpire })
 * onExpire viene chiamato se il toast scade senza che l'azione sia stata premuta
 * (usato per completare le operazioni annullabili, es. eliminare la foto).
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const current = useRef(null);

  const finish = useCallback((expired) => {
    clearTimeout(timer.current);
    const t = current.current;
    current.current = null;
    setToast(null);
    if (expired && t?.onExpire) t.onExpire();
  }, []);

  const show = useCallback(
    (opts) => {
      // Il toast precedente viene considerato scaduto (la sua operazione si conclude).
      if (current.current) finish(true);
      const t = {
        id: Date.now() + Math.random(),
        tone: "info",
        duration: opts.action ? UNDO_MS : 3000,
        ...opts,
      };
      current.current = t;
      setToast(t);
      timer.current = setTimeout(() => finish(true), t.duration);
    },
    [finish],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const api = useMemo(
    () => ({
      show,
      success: (message, opts) => show({ message, tone: "success", ...opts }),
      error: (message, opts) => show({ message, tone: "error", duration: 5000, ...opts }),
      info: (message, opts) => show({ message, tone: "info", ...opts }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <Toast
            key={toast.id}
            toast={toast}
            onAction={() => {
              const a = toast.action;
              finish(false);
              a.onClick();
            }}
          />
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
