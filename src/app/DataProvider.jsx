import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { subscribeInventory } from "../services/inventoryRepo.js";
import { subscribeShopping } from "../services/shoppingRepo.js";
import { subscribeSettings } from "../services/settingsRepo.js";
import { DEFAULT_SETTINGS } from "../utils/constants.js";
import { mergeValues, normalizeProduct, normalizeShoppingItem } from "../utils/product.js";
import { useUid } from "./AuthProvider.jsx";

const DataContext = createContext(null);

const byName = (a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" });
const millis = (ts) => (ts && typeof ts.toMillis === "function" ? ts.toMillis() : 0);

function emptySource() {
  return { items: [], raw: new Map(), loading: true, error: null, pending: false };
}

/** Sottoscrive una sola volta inventario, spesa e impostazioni e li condivide con tutte le schermate. */
export function DataProvider({ children }) {
  const uid = useUid();
  const [inventory, setInventory] = useState(emptySource);
  const [shopping, setShopping] = useState(emptySource);
  const [settingsDoc, setSettingsDoc] = useState({});
  const [today, setToday] = useState(() => new Date().toDateString());

  useEffect(() => {
    if (!uid) return undefined;
    const fail = (setter) => (error) => {
      setter((s) => ({ ...s, loading: false, error }));
    };
    const offInv = subscribeInventory(
      uid,
      (docs, meta) => {
        const raw = new Map(docs.map((d) => [d.id, d.data]));
        const items = docs.map((d) => normalizeProduct(d.id, d.data)).sort(byName);
        setInventory({ items, raw, loading: false, error: null, pending: meta.pending });
      },
      fail(setInventory),
    );
    const offShop = subscribeShopping(
      uid,
      (docs, meta) => {
        const raw = new Map(docs.map((d) => [d.id, d.data]));
        const items = docs
          .map((d) => normalizeShoppingItem(d.id, d.data))
          .sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
        setShopping({ items, raw, loading: false, error: null, pending: meta.pending });
      },
      fail(setShopping),
    );
    const offSettings = subscribeSettings(uid, setSettingsDoc, () => setSettingsDoc({}));
    return () => {
      offInv();
      offShop();
      offSettings();
    };
  }, [uid]);

  // Ricalcola gli stati quando cambia il giorno (app lasciata aperta oltre la mezzanotte).
  useEffect(() => {
    const check = () => setToday(new Date().toDateString());
    const id = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  const value = useMemo(() => {
    const configured = { ...DEFAULT_SETTINGS, ...settingsDoc };
    const settings = {
      ...configured,
      locations: mergeValues(configured.locations, inventory.items.map((p) => p.location)),
      categories: mergeValues(configured.categories, [
        ...inventory.items.map((p) => p.category),
        ...shopping.items.map((x) => x.category),
      ]),
      configuredLocations: configured.locations,
      configuredCategories: configured.categories,
    };
    return { inventory, shopping, settings, today, pending: inventory.pending || shopping.pending };
  }, [inventory, shopping, settingsDoc, today]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
