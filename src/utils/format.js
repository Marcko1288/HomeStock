const qtyFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export const formatQty = (n) => qtyFormatter.format(Number(n) || 0);

export const formatPrice = (n) => priceFormatter.format(Number(n) || 0);

/** Accetta "0,79" e "0.79". Restituisce un numero >= 0 (0 se non valido). */
export function parseDecimal(value) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  const n = Number(String(value ?? "").replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Arrotonda per evitare 0.30000000000000004 dopo le somme. */
export const roundQty = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

export function normalizeText(s) {
  return String(s ?? "")
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** "cantina" → confronto senza maiuscole/accenti per i valori nell'URL. */
export const sameText = (a, b) => normalizeText(a) === normalizeText(b);

export const toSlug = (s) => normalizeText(s).replace(/\s+/g, "-");
