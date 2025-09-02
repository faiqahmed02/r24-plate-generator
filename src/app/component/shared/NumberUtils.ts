import { Locale } from "./PlateTypes";

// ---- Helpers ----
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---- Unit conversion (rounded) ----
export const cmToIn = (cm: number) => round2(cm / 2.54);
export const inToCm = (inch: number) => round2(inch * 2.54);

// ---- UID ----
export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ---- Parsing ----
export function parseLocaleNumber(raw: string, locale: Locale): number | null {
  if (!raw) return null;
  const s = raw.trim().replace(/\s+/g, "");

  // Replace German comma with dot so JS can parse
  const normalized = locale === "de" ? s.replace(",", ".") : s;

  const n = Number(normalized);
  return Number.isFinite(n) ? round2(n) : null; // round to 2 decimals
}

// ---- Formatting ----
export function formatLocaleNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(n);
}
