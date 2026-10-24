import type { Locale } from "@/i18n/routing";

// Prices are shown with Latin digits and space grouping in every language ("18 000 DA"),
// as is usual in Algeria; the currency suffix follows the language.
const grouping = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

const CURRENCY: Record<Locale, string> = { ar: "د.ج", fr: "DA", en: "DA" };

/** "18 000" — narrow no-break spaces as thousands separators. */
export function formatAmount(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return grouping.format(n).replace(/\s/g, " ");
}

export function currencyLabel(locale: Locale): string {
  return CURRENCY[locale];
}

/** "18 000 DA" as a single string (for metadata, aria labels). */
export function formatDZD(value: number | string, locale: Locale): string {
  return `${formatAmount(value)} ${CURRENCY[locale]}`;
}

/** Whole-number formatting for yields, counts ("10 000"). */
export function formatInteger(value: number): string {
  return formatAmount(Math.round(value));
}

/** Percentage saved between a compare-at price and the selling price, or null. */
export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price || compareAt <= 0) return null;
  const pct = Math.round(((compareAt - price) / compareAt) * 100);
  return pct > 0 ? pct : null;
}
