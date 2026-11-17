import { useMemo } from "react";
import { useInventory } from "../../hooks/useInventory.js";
import { useShopping } from "../../hooks/useShopping.js";
import { useStatusOptions } from "../../hooks/useSettings.js";
import { computeIndicators, urgentItems } from "../../utils/status.js";

/** Indicatori della Home filtrati per luogo (null = tutti). */
export function useDashboard(location) {
  const { products, loading, error } = useInventory();
  const { open: shopping, loading: shopLoading } = useShopping();
  const { today, expiringDays } = useStatusOptions();

  return useMemo(() => {
    const scoped = location ? products.filter((p) => p.location === location) : products;
    return {
      loading: loading || shopLoading,
      error,
      total: scoped.length,
      counts: computeIndicators(scoped, shopping, { today, expiringDays }),
      urgent: urgentItems(scoped, { today, expiringDays, shopping, limit: 5 }),
      expiringDays,
    };
  }, [products, shopping, location, today, expiringDays, loading, shopLoading, error]);
}
