import type { Locale } from "@/i18n/routing";

/** Localised text as stored in the database: {"ar": "...", "fr": "...", "en": "..."}. */
export type Localized = Partial<Record<Locale, string>>;

// Same fallback order as the database's is_localized(): French, then English, then Arabic.
const FALLBACK: Locale[] = ["fr", "en", "ar"];

/** Picks the text for `locale`, falling back to another language rather than showing nothing. */
export function pick(value: Localized | null | undefined, locale: Locale): string {
  if (!value) return "";
  const own = value[locale]?.trim();
  if (own) return own;
  for (const l of FALLBACK) {
    const text = value[l]?.trim();
    if (text) return text;
  }
  return "";
}
