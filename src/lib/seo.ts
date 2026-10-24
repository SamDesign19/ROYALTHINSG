import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/routing";

/** Absolute site origin: NEXT_PUBLIC_SITE_URL, else the primary URL Netlify provides, else localhost. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** Canonical URL and hreflang alternates for a path that exists in every language ("" for home). */
export function alternates(locale: string, path: string): Metadata["alternates"] {
  const languages = Object.fromEntries(locales.map((l: Locale) => [l, `/${l}${path}`]));
  return { canonical: `/${locale}${path}`, languages: { ...languages, "x-default": `/ar${path}` } };
}
