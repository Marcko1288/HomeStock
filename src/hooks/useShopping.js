import { useData } from "../app/DataProvider.jsx";

export function useShopping() {
  const { shopping } = useData();
  const items = shopping.items;
  return {
    items,
    open: items.filter((x) => !x.checked),
    legacyChecked: items.filter((x) => x.checked),
    loading: shopping.loading,
    error: shopping.error,
  };
}
