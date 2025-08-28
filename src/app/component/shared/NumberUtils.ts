import { Locale } from "./PlateTypes";

export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (inch: number) => inch * 2.54;

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function parseLocaleNumber(raw: string, locale: Locale): number | null {
  if (!raw) return null;
  const s = raw.trim().replace(/\s+/g, "");
  const normalized = s.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatLocaleNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(n);
}
