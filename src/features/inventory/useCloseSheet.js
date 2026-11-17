import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";

/** Chiude un pannello aperto come rotta: torna indietro se aperto dall'app, altrimenti alla lista. */
export function useCloseSheet(fallback = "/scorte") {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    if (location.state?.modal) navigate(-1);
    else {
      // Aperto da link diretto: torna alla lista senza i parametri del form.
      const params = new URLSearchParams(location.search);
      params.delete("barcode");
      const search = params.toString();
      navigate({ pathname: fallback, search: search ? `?${search}` : "" }, { replace: true });
    }
  }, [navigate, location, fallback]);
}
