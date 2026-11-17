// Unico modulo che decide lo stato di un prodotto. Usato da Home, Scorte e filtri.
//
// - Scaduto:      quantità > 0 e scadenza < oggi
// - In scadenza:  quantità > 0 e oggi <= scadenza <= oggi + N giorni (default 7)
// - Sotto soglia: 0 < quantità <= soglia minima (soglia > 0)
// - Esaurito:     quantità = 0

import { daysBetween, isISODate, todayISO } from "./date.js";
import { normalizeText } from "./format.js";

export const STATUS_FILTERS = [
  { id: "scaduti", label: "Scaduti" },
  { id: "in-scadenza", label: "In scadenza" },
  { id: "da-riordinare", label: "Da riordinare" },
  { id: "sotto-soglia", label: "Sotto soglia" },
  { id: "esauriti", label: "Esauriti" },
  { id: "disponibili", label: "Disponibili" },
];

export function getStatus(product, { today = todayISO(), expiringDays = 7 } = {}) {
  const qty = Number(product.quantity) || 0;
  const available = qty > 0;
  const daysLeft = isISODate(product.expiryDate) ? daysBetween(today, product.expiryDate) : null;
  const expired = available && daysLeft !== null && daysLeft < 0;
  const expiring = available && daysLeft !== null && daysLeft >= 0 && daysLeft <= expiringDays;
  const out = !available;
  const min = Number(product.minQuantity) || 0;
  const low = available && min > 0 && qty <= min;
  return { available, daysLeft, expired, expiring, out, low, reorder: low || out };
}

export function matchesStatus(status, filterId) {
  switch (filterId) {
    case "scaduti":
      return status.expired;
    case "in-scadenza":
      return status.expiring;
    case "sotto-soglia":
      return status.low;
    case "esauriti":
      return status.out;
    case "da-riordinare":
      return status.reorder;
    case "disponibili":
      return status.available;
    default:
      return true;
  }
}

/** Rango di urgenza: più basso = più urgente. null = nessuna urgenza. */
function urgencyRank(status) {
  if (status.expired) return 0;
  if (status.expiring) return 1;
  if (status.low) return 2;
  if (status.out) return 3;
  return null;
}

export function compareUrgency(a, b) {
  const ra = urgencyRank(a.status);
  const rb = urgencyRank(b.status);
  if (ra !== rb) return (ra ?? 99) - (rb ?? 99);
  if (ra === 0 || ra === 1) return a.status.daysLeft - b.status.daysLeft;
  if (ra === 2) {
    const fa = a.product.quantity / (a.product.minQuantity || 1);
    const fb = b.product.quantity / (b.product.minQuantity || 1);
    if (fa !== fb) return fa - fb;
  }
  return a.product.name.localeCompare(b.product.name, "it");
}

/**
 * Prodotti più urgenti: prima gli scaduti, poi la scadenza più vicina, poi sotto soglia ed esauriti.
 * I prodotti da riordinare già presenti nella lista della spesa sono esclusi.
 */
export function urgentItems(products, { today, expiringDays, shopping = [], limit = 5 } = {}) {
  const inList = shoppingMatcher(shopping);
  return products
    .map((product) => ({ product, status: getStatus(product, { today, expiringDays }) }))
    .filter(({ product, status }) => {
      if (status.expired || status.expiring) return true;
      return status.reorder && !inList(product);
    })
    .sort(compareUrgency)
    .slice(0, limit);
}

export function computeIndicators(products, shopping, { today, expiringDays } = {}) {
  const counts = { expired: 0, expiring: 0, reorder: 0, low: 0, out: 0, toBuy: 0 };
  for (const p of products) {
    const s = getStatus(p, { today, expiringDays });
    if (s.expired) counts.expired += 1;
    if (s.expiring) counts.expiring += 1;
    if (s.reorder) counts.reorder += 1;
    if (s.low) counts.low += 1;
    if (s.out) counts.out += 1;
  }
  counts.toBuy = shopping.filter((x) => !x.checked).length;
  return counts;
}

/** Restituisce una funzione che dice se un prodotto è già nella lista della spesa (barcode o nome). */
export function shoppingMatcher(shopping) {
  const barcodes = new Set();
  const names = new Set();
  for (const item of shopping) {
    if (item.checked) continue;
    if (item.barcode) barcodes.add(item.barcode);
    names.add(normalizeText(item.name));
  }
  return (product) =>
    (product.barcode && barcodes.has(product.barcode)) || names.has(normalizeText(product.name));
}
