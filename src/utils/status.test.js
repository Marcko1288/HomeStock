import { describe, expect, it } from "vitest";
import { computeIndicators, getStatus, matchesStatus, urgentItems } from "./status.js";
import { daysBetween, describeExpiry, normalizeISODate, todayISO } from "./date.js";

const today = "2026-11-17";
const p = (o) => ({ id: o.name, name: "x", quantity: 1, minQuantity: 0, expiryDate: "", barcode: "", ...o });

describe("date", () => {
  it("confronta i giorni in ora locale", () => {
    expect(daysBetween(today, "2026-11-17")).toBe(0);
    expect(daysBetween(today, "2026-11-16")).toBe(-1);
    expect(daysBetween(today, "2026-12-17")).toBe(30);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2); // cambio ora legale
  });
  it("normalizza i formati di scadenza", () => {
    expect(normalizeISODate("2026-01-05")).toBe("2026-01-05");
    expect(normalizeISODate("2026-01-05T10:00:00Z")).toBe("2026-01-05");
    expect(normalizeISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(normalizeISODate({ toDate: () => new Date(2026, 0, 5) })).toBe("2026-01-05");
    expect(normalizeISODate("boh")).toBe("");
    expect(normalizeISODate(null)).toBe("");
  });
  it("descrive la scadenza", () => {
    expect(describeExpiry(0)).toBe("Scade oggi");
    expect(describeExpiry(-3)).toBe("Scaduto da 3 giorni");
  });
  it("todayISO è locale", () => {
    expect(todayISO(new Date(2026, 10, 17, 0, 30))).toBe("2026-11-17");
  });
});

describe("getStatus", () => {
  it("il giorno di scadenza non è ancora scaduto", () => {
    const s = getStatus(p({ expiryDate: today }), { today });
    expect(s.expired).toBe(false);
    expect(s.expiring).toBe(true);
  });
  it("scaduto solo se quantità > 0", () => {
    expect(getStatus(p({ expiryDate: "2026-01-01" }), { today }).expired).toBe(true);
    const finito = getStatus(p({ expiryDate: "2026-01-01", quantity: 0 }), { today });
    expect(finito.expired).toBe(false);
    expect(finito.out).toBe(true);
  });
  it("in scadenza entro N giorni", () => {
    expect(getStatus(p({ expiryDate: "2026-11-24" }), { today, expiringDays: 7 }).expiring).toBe(true);
    expect(getStatus(p({ expiryDate: "2026-11-25" }), { today, expiringDays: 7 }).expiring).toBe(false);
  });
  it("sotto soglia: 0 < q <= min", () => {
    expect(getStatus(p({ quantity: 2, minQuantity: 2 }), { today }).low).toBe(true);
    expect(getStatus(p({ quantity: 3, minQuantity: 2 }), { today }).low).toBe(false);
    expect(getStatus(p({ quantity: 0, minQuantity: 2 }), { today }).low).toBe(false);
    expect(getStatus(p({ quantity: 1, minQuantity: 0 }), { today }).low).toBe(false);
  });
  it("filtri di stato", () => {
    const s = getStatus(p({ quantity: 0 }), { today });
    expect(matchesStatus(s, "esauriti")).toBe(true);
    expect(matchesStatus(s, "da-riordinare")).toBe(true);
    expect(matchesStatus(s, "disponibili")).toBe(false);
    expect(matchesStatus(s, undefined)).toBe(true);
  });
});

describe("urgenza e indicatori", () => {
  const products = [
    p({ name: "ok", quantity: 5 }),
    p({ name: "basso", quantity: 1, minQuantity: 3 }),
    p({ name: "scade", expiryDate: "2026-11-19" }),
    p({ name: "scaduto-vecchio", expiryDate: "2026-10-01" }),
    p({ name: "scaduto", expiryDate: "2026-11-10" }),
    p({ name: "finito", quantity: 0 }),
    p({ name: "in-lista", quantity: 0, barcode: "123" }),
  ];
  it("ordina scaduti → in scadenza → sotto soglia → esauriti, esclude quelli già in lista", () => {
    const list = urgentItems(products, { today, expiringDays: 7, shopping: [{ name: "zzz", barcode: "123" }] });
    expect(list.map((x) => x.product.name)).toEqual(["scaduto-vecchio", "scaduto", "scade", "basso", "finito"]);
  });
  it("conta gli indicatori", () => {
    const c = computeIndicators(products, [{ checked: false }, { checked: true }], { today, expiringDays: 7 });
    expect(c).toMatchObject({ expired: 2, expiring: 1, reorder: 3, low: 1, out: 2, toBuy: 1 });
  });
});
