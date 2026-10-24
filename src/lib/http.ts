/**
 * For API routes whose response depends on the query string (?q=, ?wilaya=, ?brand=, filters).
 * Netlify's CDN cache key ignores the query string by default, so a shared-cache header made every
 * query return the first cached answer (same autocomplete for any text, same communes for every
 * wilaya). These routes are cheap database reads: keep them out of shared caches.
 */
export const NO_CDN_CACHE = { "Cache-Control": "private, no-store" } as const;
