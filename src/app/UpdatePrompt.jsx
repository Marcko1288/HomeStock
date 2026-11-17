import { createContext, useCallback, useContext, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw } from "lucide-react";

const UpdateContext = createContext({ check: async () => false });

const HOUR = 60 * 60 * 1000;

/**
 * Service worker con aggiornamento controllato: quando c'è una nuova versione compare
 * il banner "Nuova versione disponibile — Aggiorna" e l'app si ricarica solo su richiesta.
 */
export function UpdateProvider({ children }) {
  const registration = useRef(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      registration.current = reg;
      if (!reg) return;
      // Controllo periodico e al ritorno in primo piano (le PWA iOS restano aperte a lungo).
      setInterval(() => reg.update().catch(() => {}), HOUR);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) reg.update().catch(() => {});
      });
    },
  });

  const check = useCallback(async () => {
    const reg = registration.current;
    if (!reg) return false;
    try {
      await reg.update();
    } catch {
      return false;
    }
    return Boolean(reg.waiting || reg.installing);
  }, []);

  return (
    <UpdateContext.Provider value={{ check }}>
      {children}
      {needRefresh && (
        <div className="update-banner" role="alert">
          <RefreshCw aria-hidden="true" />
          <span>Nuova versione disponibile</span>
          <button type="button" className="btn btn--sm btn--light" onClick={() => updateServiceWorker(true)}>
            Aggiorna
          </button>
          <button type="button" className="update-banner__later" onClick={() => setNeedRefresh(false)}>
            Più tardi
          </button>
        </div>
      )}
    </UpdateContext.Provider>
  );
}

export const usePwaUpdate = () => useContext(UpdateContext);
