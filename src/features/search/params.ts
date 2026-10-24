import { z } from "zod";
import { INK_COLORS, ORIGINS, PRODUCT_TYPES, type InkColor, type Origin, type ProductType } from "@/features/catalog/types";

export const SORTS = ["relevance", "popular", "newest", "price_asc", "price_desc"] as const;
export type Sort = (typeof SORTS)[number];

export const PAGE_SIZE = 24;
const MAX_PAGE = 200;

export type SearchFilters = {
  q: string | null;
  category: string | null;
  brands: string[];
  types: ProductType[];
  colors: InkColor[];
  origin: Origin | null;
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  printer: string | null; // printer slug
  sort: Sort;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(120);
const price = z.coerce.number().finite().min(0).max(100_000_000);

function all(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean);
}
function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function oneOf<T extends string>(list: readonly T[], v: string | undefined): T | null {
  return v !== undefined && (list as readonly string[]).includes(v) ? (v as T) : null;
}
function manyOf<T extends string>(list: readonly T[], v: string | string[] | undefined): T[] {
  return [...new Set(all(v).filter((s): s is T => (list as readonly string[]).includes(s)))];
}

/**
 * Turns URL search params into validated filters. Unknown or malformed values are dropped rather
 * than rejected, so a hand-edited URL still shows results.
 */
export function parseSearchParams(sp: RawSearchParams): SearchFilters {
  const q = first(sp.q)?.trim().slice(0, 120) || null;
  const min = price.safeParse(first(sp.min));
  const max = price.safeParse(first(sp.max));
  const category = slug.safeParse(first(sp.category));
  const printer = slug.safeParse(first(sp.printer));
  const page = z.coerce.number().int().min(1).max(MAX_PAGE).safeParse(first(sp.page));
  const sort = oneOf(SORTS, first(sp.sort));
  return {
    q,
    category: category.success ? category.data : null,
    brands: [...new Set(all(sp.brand).filter((b) => slug.safeParse(b).success))].slice(0, 20),
    types: manyOf(PRODUCT_TYPES, sp.type),
    colors: manyOf(INK_COLORS, sp.color),
    origin: oneOf(ORIGINS, first(sp.origin)),
    minPrice: first(sp.min) && min.success ? min.data : null,
    maxPrice: first(sp.max) && max.success ? max.data : null,
    inStock: first(sp.stock) === "1",
    printer: printer.success ? printer.data : null,
    // Relevance only means something with a query; otherwise default to popularity.
    sort: sort ?? (q ? "relevance" : "popular"),
    page: page.success ? page.data : 1,
  };
}

/** Number of filters the shopper has set (excluding query, sort and page), for the "Filters (3)" button. */
export function activeFilterCount(f: SearchFilters): number {
  return (
    f.brands.length + f.types.length + f.colors.length +
    (f.origin ? 1 : 0) + (f.minPrice !== null ? 1 : 0) + (f.maxPrice !== null ? 1 : 0) +
    (f.inStock ? 1 : 0) + (f.printer ? 1 : 0) + (f.category ? 1 : 0)
  );
}

/** Builds a query string from filters (inverse of parseSearchParams), omitting defaults. */
export function toSearchParams(f: Partial<SearchFilters>): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category) p.set("category", f.category);
  for (const b of f.brands ?? []) p.append("brand", b);
  for (const t of f.types ?? []) p.append("type", t);
  for (const c of f.colors ?? []) p.append("color", c);
  if (f.origin) p.set("origin", f.origin);
  if (f.minPrice != null) p.set("min", String(f.minPrice));
  if (f.maxPrice != null) p.set("max", String(f.maxPrice));
  if (f.inStock) p.set("stock", "1");
  if (f.printer) p.set("printer", f.printer);
  if (f.sort && f.sort !== (f.q ? "relevance" : "popular")) p.set("sort", f.sort);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  return p;
}
