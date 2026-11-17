// Le date di scadenza sono stringhe "YYYY-MM-DD" e vanno confrontate come giorni
// locali: new Date("2026-11-17") sarebbe mezzanotte UTC e sposterebbe la scadenza.

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n) => String(n).padStart(2, "0");

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(now = new Date()) {
  return toISODate(now);
}

export function isISODate(value) {
  return typeof value === "string" && ISO_RE.test(value);
}

/** Converte un valore di scadenza (stringa, Date o Timestamp Firestore) in "YYYY-MM-DD" o "". */
export function normalizeISODate(value) {
  if (!value) return "";
  if (isISODate(value)) return value;
  if (typeof value === "string") {
    const head = value.slice(0, 10);
    return isISODate(head) ? head : "";
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : toISODate(value);
  if (typeof value.toDate === "function") return toISODate(value.toDate());
  return "";
}

function dayNumber(iso) {
  const [, y, m, d] = ISO_RE.exec(iso);
  return Date.UTC(Number(y), Number(m) - 1, Number(d)) / 86400000;
}

/** Giorni da `fromISO` a `toISO` (negativo se toISO è nel passato). */
export function daysBetween(fromISO, toISO) {
  return Math.round(dayNumber(toISO) - dayNumber(fromISO));
}

/** "17/11" oppure "17/11/27" se l'anno è diverso da quello corrente. */
export function formatShortDate(iso, now = new Date()) {
  if (!isISODate(iso)) return "";
  const [, y, m, d] = ISO_RE.exec(iso);
  return Number(y) === now.getFullYear() ? `${d}/${m}` : `${d}/${m}/${y.slice(2)}`;
}

export function formatLongDate(iso) {
  if (!isISODate(iso)) return "";
  const [, y, m, d] = ISO_RE.exec(iso);
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Testo relativo per la scadenza: "scade oggi", "scade domani", "scaduto da 3 giorni"… */
export function describeExpiry(daysLeft, iso) {
  if (daysLeft === null || daysLeft === undefined) return "";
  if (daysLeft < -1) return `Scaduto da ${-daysLeft} giorni`;
  if (daysLeft === -1) return "Scaduto ieri";
  if (daysLeft === 0) return "Scade oggi";
  if (daysLeft === 1) return "Scade domani";
  if (daysLeft <= 7) return `Scade tra ${daysLeft} giorni`;
  return `Scade il ${formatShortDate(iso)}`;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "Buonanotte";
  if (h < 13) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export function formatToday(now = new Date()) {
  const s = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
