import { useData } from "../app/DataProvider.jsx";

/** Prodotti normalizzati e ordinati per nome. */
export function useInventory() {
  const { inventory } = useData();
  return {
    products: inventory.items,
    loading: inventory.loading,
    error: inventory.error,
    findById: (id) => inventory.items.find((p) => p.id === id),
  };
}
