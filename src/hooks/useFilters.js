import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { sameText } from "../utils/format.js";

const KEYS = ["q", "luogo", "categoria", "stato", "gruppi"];

/**
 * Filtri salvati nell'URL (es. /scorte?stato=scaduti&luogo=cantina) così le card della Home
 * aprono viste filtrate e il tasto indietro funziona.
 */
export function useFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const f = {};
    KEYS.forEach((k) => {
      f[k] = params.get(k) || "";
    });
    return f;
  }, [params]);

  const setFilter = useCallback(
    (key, value, { replace = true } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace },
      );
    },
    [setParams],
  );

  const clear = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams();
        if (prev.get("gruppi")) next.set("gruppi", prev.get("gruppi"));
        return next;
      },
      { replace: true },
    );
  }, [setParams]);

  return { filters, setFilter, clear, search: params.toString() ? `?${params}` : "" };
}

/** Trova il valore reale (es. "Cantina") a partire dal parametro URL (es. "cantina"). */
export const resolveOption = (options, value) => (value ? options.find((o) => sameText(o, value)) : undefined);
