import "server-only";
import { createPublicClient } from "@/server/supabase";
import type { ProductCardData } from "@/features/catalog/types";
import { PAGE_SIZE, type SearchFilters } from "./params";

export type SearchResult = { items: ProductCardData[]; total: number; page: number; pageCount: number };

type Row = ProductCardData & { rank: number; total_count: number };

/**
 * Runs search_products() (supabase/migrations/*_functions.sql): only active products, verified
 * compatibility, prices and stock flags computed in the database.
 */
export async function searchProducts(
  f: SearchFilters,
  opts: { printerId?: string | null; limit?: number } = {},
): Promise<SearchResult> {
  const limit = opts.limit ?? PAGE_SIZE;
  const { data, error } = await createPublicClient().rpc("search_products", {
    p_query: f.q,
    p_category: f.category,
    p_brands: f.brands.length ? f.brands : null,
    p_types: f.types.length ? f.types : null,
    p_colors: f.colors.length ? f.colors : null,
    p_origin: f.origin,
    p_min_price: f.minPrice,
    p_max_price: f.maxPrice,
    p_in_stock: f.inStock,
    p_printer: opts.printerId ?? null,
    p_sort: f.sort,
    p_limit: limit,
    p_offset: (f.page - 1) * limit,
  });
  if (error) throw new Error(`Search failed: ${error.message}`);
  const rows = (data ?? []) as Row[];
  const total = rows[0]?.total_count ?? 0;
  return {
    items: rows.map(({ rank, total_count, ...item }) => item),
    total: Number(total),
    page: f.page,
    pageCount: Math.max(1, Math.ceil(Number(total) / limit)),
  };
}

export type Suggestions = {
  products: { slug: string; name: ProductCardData["name"]; model_code: string | null; price_dzd: number; image_path: string | null }[];
  printers: { id: string; slug: string; model: string; brand: string }[];
  categories: { slug: string; name: ProductCardData["name"] }[];
};

export async function getSuggestions(q: string): Promise<Suggestions> {
  const { data, error } = await createPublicClient().rpc("search_suggestions", { p_query: q, p_limit: 6 });
  if (error) throw new Error(`Suggestions failed: ${error.message}`);
  return data as Suggestions;
}
