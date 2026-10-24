import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/server/supabase";
import type {
  Banner, Brand, Category, CategoryNode, Collection, CompatiblePrinter, ProductCardData, ProductDetail,
} from "./types";

function fail(what: string, error: { message: string }): never {
  throw new Error(`Failed to load ${what}: ${error.message}`);
}

// Columns needed to build a product card from the products table (outside search_products()).
const CARD_SELECT =
  "id, slug, sku, name, model_code, product_type, origin, color, yield_type, page_yield, volume_ml, " +
  "price_dzd, compare_at_dzd, brand:brands(name, slug), images:product_images(storage_path, position)";

type CardRow = Omit<ProductCardData, "brand_name" | "brand_slug" | "image_path" | "in_stock" | "low_stock"> & {
  brand: { name: string; slug: string } | null;
  images: { storage_path: string; position: number }[];
};

/** Public in-stock / low-stock flags (exact quantities are never exposed). */
export async function getAvailability(ids: string[]) {
  const map = new Map<string, { in_stock: boolean; low_stock: boolean }>();
  if (ids.length === 0) return map;
  const { data, error } = await createPublicClient().rpc("product_availability", { p_ids: ids });
  if (error) fail("availability", error);
  for (const row of (data ?? []) as { product_id: string; in_stock: boolean; low_stock: boolean }[]) {
    map.set(row.product_id, { in_stock: row.in_stock, low_stock: row.low_stock });
  }
  return map;
}

async function toCards(rows: CardRow[]): Promise<ProductCardData[]> {
  const availability = await getAvailability(rows.map((r) => r.id));
  return rows.map(({ brand, images, ...p }) => ({
    ...p,
    brand_name: brand?.name ?? null,
    brand_slug: brand?.slug ?? null,
    image_path: [...images].sort((a, b) => a.position - b.position)[0]?.storage_path ?? null,
    in_stock: availability.get(p.id)?.in_stock ?? false,
    low_stock: availability.get(p.id)?.low_stock ?? false,
  }));
}

// ---------------------------------------------------------------------------
// Categories and brands
// ---------------------------------------------------------------------------

export const getCategories = cache(async (): Promise<Category[]> => {
  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, parent_id, slug, name, description, image_path, sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("slug");
  if (error) fail("categories", error);
  return (data ?? []) as Category[];
});

export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(categories.map((c) => [c.id, { ...c, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else if (!node.parent_id) roots.push(node);
  }
  return roots;
}

export const getCategoryTree = cache(async () => buildCategoryTree(await getCategories()));

/** A category with its ancestors (root first) and direct children. */
export const getCategory = cache(async (slug: string) => {
  const all = await getCategories();
  const category = all.find((c) => c.slug === slug);
  if (!category) return null;
  const byId = new Map(all.map((c) => [c.id, c]));
  const ancestors: Category[] = [];
  for (let p = category.parent_id ? byId.get(category.parent_id) : undefined; p; p = p.parent_id ? byId.get(p.parent_id) : undefined) {
    ancestors.unshift(p);
  }
  return { category, ancestors, children: all.filter((c) => c.parent_id === category.id) };
});

export const getBrands = cache(async (): Promise<Brand[]> => {
  const { data, error } = await createPublicClient()
    .from("brands")
    .select("id, slug, name, logo_path, makes_printers")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) fail("brands", error);
  return (data ?? []) as Brand[];
});

export const getBrand = cache(async (slug: string) => (await getBrands()).find((b) => b.slug === slug) ?? null);

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

type DetailRow = Omit<ProductDetail, "images" | "tiers" | "in_stock" | "low_stock"> & {
  images: ProductDetail["images"];
  tiers: ProductDetail["tiers"];
};

export const getProduct = cache(async (slug: string): Promise<ProductDetail | null> => {
  const { data, error } = await createPublicClient()
    .from("products")
    .select(
      "id, slug, sku, product_type, name, short_description, description, variant_label, model_code, " +
        "oem_reference, origin, color, yield_type, page_yield, volume_ml, pack_size, specs, price_dzd, " +
        "compare_at_dzd, group_id, seo, brand:brands(id, slug, name), category:categories(id, slug, name, parent_id), " +
        "images:product_images(storage_path, alt, position), tiers:price_tiers(min_quantity, price_dzd, business_only)",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error) fail("product", error);
  if (!data) return null;
  const row = data as unknown as DetailRow;
  const availability = (await getAvailability([row.id])).get(row.id);
  return {
    ...row,
    images: [...row.images].sort((a, b) => a.position - b.position),
    tiers: [...row.tiers].sort((a, b) => a.min_quantity - b.min_quantity),
    in_stock: availability?.in_stock ?? false,
    low_stock: availability?.low_stock ?? false,
  };
});

/** Verified compatible printers for a product (unverified links are filtered by RLS and the view). */
export async function getCompatiblePrinters(productId: string): Promise<CompatiblePrinter[]> {
  const { data, error } = await createPublicClient()
    .from("product_printers")
    .select("printer_id, slug, model, brand_name, series_name")
    .eq("product_id", productId)
    .order("brand_name")
    .order("model");
  if (error) fail("compatible printers", error);
  return (data ?? []) as CompatiblePrinter[];
}

/** Other members of the product's variant group (colours, yields), including itself, for the variant picker. */
export async function getVariants(groupId: string) {
  const { data, error } = await createPublicClient()
    .from("products")
    .select("id, slug, name, variant_label, color, yield_type")
    .eq("group_id", groupId)
    .eq("status", "active")
    .order("sku");
  if (error) fail("variants", error);
  return (data ?? []) as Pick<ProductDetail, "id" | "slug" | "name" | "variant_label" | "color" | "yield_type">[];
}

/** The same cartridge code in the other origin (original <-> compatible), shown as an alternative. */
export async function getAlternatives(product: Pick<ProductDetail, "id" | "model_code" | "origin">) {
  if (!product.model_code || !product.origin) return [];
  const { data, error } = await createPublicClient()
    .from("products")
    .select(CARD_SELECT)
    .eq("status", "active")
    .eq("model_code", product.model_code)
    .neq("origin", product.origin)
    .neq("id", product.id)
    .order("price_dzd")
    .limit(4);
  if (error) fail("alternatives", error);
  return toCards((data ?? []) as unknown as CardRow[]);
}

export async function getFeaturedProducts(limit = 8) {
  const { data, error } = await createPublicClient()
    .from("products")
    .select(CARD_SELECT)
    .eq("status", "active")
    .eq("is_featured", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) fail("featured products", error);
  return toCards((data ?? []) as unknown as CardRow[]);
}

export const getReviewsEnabled = cache(async () => {
  const { data, error } = await createPublicClient().from("settings").select("value").eq("key", "reviews_enabled").maybeSingle();
  if (error) fail("settings", error);
  return data?.value === true;
});

export type Review = { id: string; rating: number; title: string | null; body: string | null; verified_purchase: boolean; created_at: string };

/** Approved reviews; RLS returns none while reviews are disabled in settings. */
export async function getReviews(productId: string): Promise<Review[]> {
  const { data, error } = await createPublicClient()
    .from("reviews")
    .select("id, rating, title, body, verified_purchase, created_at")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) fail("reviews", error);
  return (data ?? []) as Review[];
}

// ---------------------------------------------------------------------------
// Marketing
// ---------------------------------------------------------------------------

export async function getBanners(placement = "home_hero"): Promise<Banner[]> {
  const { data, error } = await createPublicClient()
    .from("banners")
    .select("id, title, subtitle, cta_label, cta_href, image_path")
    .eq("placement", placement)
    .order("sort_order")
    .limit(5);
  if (error) fail("banners", error);
  return (data ?? []) as Banner[];
}

export async function getHomeCollections(): Promise<Collection[]> {
  const { data, error } = await createPublicClient()
    .from("collections")
    .select("id, slug, title, description, image_path")
    .eq("show_on_home", true)
    .order("sort_order")
    .limit(6);
  if (error) fail("collections", error);
  return (data ?? []) as Collection[];
}

export const getCollection = cache(async (slug: string) => {
  const client = createPublicClient();
  const { data, error } = await client
    .from("collections")
    .select("id, slug, title, description, image_path")
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail("collection", error);
  if (!data) return null;
  const collection = data as Collection;
  const { data: links, error: linkError } = await client
    .from("collection_products")
    .select(`position, product:products!inner(${CARD_SELECT})`)
    .eq("collection_id", collection.id)
    .eq("product.status", "active")
    .order("position")
    .limit(100);
  if (linkError) fail("collection products", linkError);
  const rows = ((links ?? []) as unknown as { product: CardRow }[]).map((l) => l.product);
  return { collection, products: await toCards(rows) };
});
