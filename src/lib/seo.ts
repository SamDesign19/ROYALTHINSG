import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/routing";

/** Canonical URL and hreflang alternates for a path that exists in every language ("" for home). */
export function alternates(locale: string, path: string): Metadata["alternates"] {
  const languages = Object.fromEntries(locales.map((l: Locale) => [l, `/${l}${path}`]));
  return { canonical: `/${locale}${path}`, languages: { ...languages, "x-default": `/ar${path}` } };
}
