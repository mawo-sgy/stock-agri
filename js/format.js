// French formatting for numbers, money, quantities and dates.
// Every space inside a number is a non-breaking space, so "1 300 000 F" never splits across lines.

export const NBSP = " ";

const dayName = new Intl.DateTimeFormat("fr-FR", { weekday: "long" });
const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const clock = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** 1300000 -> "1 300 000" */
export function groupDigits(n) {
  const sign = n < 0 ? "−" : "";
  return sign + String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 4.25 -> "4,3", 30 -> "30" (French decimal comma, at most `digits` decimals) */
export function decimal(n, digits = 1) {
  const factor = 10 ** digits;
  const rounded = Math.round(n * factor) / factor;
  const [whole, fraction] = String(Math.abs(rounded)).split(".");
  return (rounded < 0 ? "−" : "") + groupDigits(Number(whole)) + (fraction ? "," + fraction : "");
}

/** Tonnes from kilograms, value only: 4200 -> "4,2" */
export const tonsValue = (kg) => decimal(kg / 1000, 1);

/** Readable quantity: 4200 -> "4,2 t", 400 -> "400 kg" */
export function quantity(kg) {
  return kg >= 1000 ? tonsValue(kg) + NBSP + "t" : groupDigits(kg) + NBSP + "kg";
}

/** 1300000 -> "1 300 000 F" */
export const money = (francs) => groupDigits(francs) + NBSP + "F";

/** Short money for tight spots: 1300000 -> "1,3 M F", 150000 -> "150 000 F" */
export function moneyShort(francs) {
  if (Math.abs(francs) >= 1_000_000) return decimal(francs / 1_000_000, 1) + NBSP + "M" + NBSP + "F";
  return money(francs);
}

/** Parses what she types: "1 150", "1150", "2,5" -> number (0 when empty or invalid). */
export function parseNumber(text) {
  const n = parseFloat(String(text ?? "").replace(/[\s  ]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Local calendar day "YYYY-MM-DD" for grouping. */
export function dayKey(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days between two dates, by calendar day. */
export function daysBetween(from, to = new Date()) {
  const a = new Date(dayKey(from) + "T00:00:00");
  const b = new Date(dayKey(to) + "T00:00:00");
  return Math.round((b - a) / 86_400_000);
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Journal group label: "Aujourd’hui", "Hier · samedi 24 octobre", "Jeudi 23 octobre". */
export function dayLabel(date, now = new Date()) {
  const ago = daysBetween(date, now);
  const full = `${dayName.format(new Date(date))} ${dayMonth.format(new Date(date))}`;
  if (ago === 0) return "Aujourd’hui";
  if (ago === 1) return "Hier · " + full;
  return capitalize(full);
}

/** "14 oct." */
export const shortDate = (date) => shortDay.format(new Date(date));

/** "09:40" */
export const time = (date) => clock.format(new Date(date));

/** "il y a 11 j", "aujourd’hui", "hier" */
export function ago(date, now = new Date()) {
  const d = daysBetween(date, now);
  if (d <= 0) return "aujourd’hui";
  if (d === 1) return "hier";
  return `il y a ${d}${NBSP}j`;
}

/** Long date for headers: "Dimanche 26 octobre" */
export const longDate = (date) => capitalize(`${dayName.format(new Date(date))} ${dayMonth.format(new Date(date))}`);

/** "YYYY-MM-DD" for <input type="date"> */
export const inputDate = (date) => dayKey(date);
