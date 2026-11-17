import { DEFAULT_SETTINGS, FALLBACK_CATEGORY, UNITS } from "./constants.js";
import { normalizeISODate } from "./date.js";
import { parseDecimal, roundQty } from "./format.js";

const num = (v) => {
  const n = typeof v === "number" ? v : parseDecimal(v);
  return Number.isFinite(n) && n > 0 ? roundQty(n) : 0;
};

const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : v == null ? "" : String(v).slice(0, max));

/** Prodotto letto da Firestore → oggetto sempre completo e coerente per l'interfaccia. */
export function normalizeProduct(id, data = {}) {
  return {
    id,
    name: str(data.name) || "Senza nome",
    barcode: str(data.barcode, 64),
    quantity: num(data.quantity),
    unit: str(data.unit, 16) || "pz",
    location: str(data.location, 60) || "Casa",
    category: str(data.category, 60) || FALLBACK_CATEGORY,
    imageUrl: str(data.imageUrl, 2048),
    imagePath: str(data.imagePath, 512),
    minQuantity: num(data.minQuantity),
    expiryDate: normalizeISODate(data.expiryDate),
    minPrice: num(data.minPrice),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export function normalizeShoppingItem(id, data = {}) {
  return {
    id,
    name: str(data.name) || "Senza nome",
    barcode: str(data.barcode, 64),
    imageUrl: str(data.imageUrl, 2048),
    quantity: num(data.quantity) || 1,
    unit: str(data.unit, 16) || "pz",
    category: str(data.category, 60) || FALLBACK_CATEGORY,
    checked: data.checked === true,
    createdAt: data.createdAt ?? null,
  };
}

/** Campi scrivibili di un prodotto (dal form) con i tipi del modello esistente. */
export function productFields(input) {
  const fields = {
    name: str(input.name) || "Senza nome",
    barcode: str(input.barcode, 64).replace(/\s+/g, ""),
    quantity: num(input.quantity),
    unit: UNITS.includes(input.unit) ? input.unit : str(input.unit, 16) || "pz",
    location: str(input.location, 60) || "Casa",
    category: str(input.category, 60) || FALLBACK_CATEGORY,
    imageUrl: str(input.imageUrl, 2048),
    minQuantity: num(input.minQuantity),
    expiryDate: normalizeISODate(input.expiryDate),
    minPrice: num(input.minPrice),
  };
  if (input.imagePath !== undefined) fields.imagePath = str(input.imagePath, 512);
  return fields;
}

export function shoppingFields(input) {
  return {
    name: str(input.name) || "Senza nome",
    barcode: str(input.barcode, 64),
    imageUrl: str(input.imageUrl, 2048),
    quantity: num(input.quantity) || 1,
    unit: str(input.unit, 16) || "pz",
    category: str(input.category, 60) || FALLBACK_CATEGORY,
    checked: false,
  };
}

export function emptyProduct(overrides = {}, settings = DEFAULT_SETTINGS) {
  return {
    name: "",
    barcode: "",
    quantity: 1,
    unit: "pz",
    location: settings.locations?.[0] || "Casa",
    category: "Alimentari",
    imageUrl: "",
    imagePath: "",
    minQuantity: settings.defaultMinQuantity || 0,
    expiryDate: "",
    minPrice: 0,
    ...overrides,
  };
}

/** Unione ordinata dei valori configurati e di quelli effettivamente usati nei dati. */
export function mergeValues(configured, used) {
  const out = [...configured];
  const seen = new Set(configured.map((x) => x.toLocaleLowerCase("it-IT")));
  for (const v of used) {
    const k = v.toLocaleLowerCase("it-IT");
    if (v && !seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return out;
}
