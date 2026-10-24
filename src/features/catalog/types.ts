import type { Localized } from "@/lib/localized";

// Mirrors the enums in supabase/migrations/20261023000001_extensions_and_types.sql.
export const PRODUCT_TYPES = [
  "ink_bottle", "ink_cartridge", "toner", "printer", "drum", "maintenance_box",
  "printer_part", "paper", "label", "cleaning", "other",
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const INK_COLORS = [
  "black", "cyan", "magenta", "yellow", "photo_black", "matte_black", "grey",
  "light_cyan", "light_magenta", "red", "blue", "green", "white", "tri_color", "multi", "none",
] as const;
export type InkColor = (typeof INK_COLORS)[number];

export const ORIGINS = ["original", "compatible"] as const;
export type Origin = (typeof ORIGINS)[number];

export const YIELD_TYPES = ["standard", "high", "extra_high"] as const;
export type YieldType = (typeof YIELD_TYPES)[number];

export const PRINTER_KINDS = ["inkjet", "laser", "multifunction", "tank", "office", "home", "large_format", "other"] as const;
export type PrinterKind = (typeof PRINTER_KINDS)[number];

/** Everything a product card needs (the shape returned by search_products()). */
export type ProductCardData = {
  id: string;
  slug: string;
  sku: string;
  name: Localized;
  model_code: string | null;
  product_type: ProductType;
  origin: Origin | null;
  color: InkColor | null;
  yield_type: YieldType | null;
  page_yield: number | null;
  volume_ml: number | null;
  price_dzd: number;
  compare_at_dzd: number | null;
  brand_name: string | null;
  brand_slug: string | null;
  image_path: string | null;
  in_stock: boolean;
  low_stock: boolean;
};

export type Category = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: Localized;
  description: Localized | null;
  image_path: string | null;
  sort_order: number;
};

export type CategoryNode = Category & { children: CategoryNode[] };

export type Brand = {
  id: string;
  slug: string;
  name: string;
  logo_path: string | null;
  makes_printers: boolean;
};

export type ProductImage = { storage_path: string; alt: Localized | null; position: number };

export type PriceTier = { min_quantity: number; price_dzd: number; business_only: boolean };

export type CompatiblePrinter = {
  printer_id: string;
  slug: string;
  model: string;
  brand_name: string;
  series_name: string | null;
};

export type ProductDetail = {
  id: string;
  slug: string;
  sku: string;
  product_type: ProductType;
  name: Localized;
  short_description: Localized | null;
  description: Localized | null;
  variant_label: Localized | null;
  model_code: string | null;
  oem_reference: string | null;
  origin: Origin | null;
  color: InkColor | null;
  yield_type: YieldType | null;
  page_yield: number | null;
  volume_ml: number | null;
  pack_size: number;
  specs: Record<string, unknown>;
  price_dzd: number;
  compare_at_dzd: number | null;
  group_id: string | null;
  seo: { title?: Localized; description?: Localized };
  brand: Pick<Brand, "id" | "slug" | "name"> | null;
  category: Pick<Category, "id" | "slug" | "name" | "parent_id">;
  images: ProductImage[];
  tiers: PriceTier[];
  in_stock: boolean;
  low_stock: boolean;
};

export type Banner = {
  id: string;
  title: Localized;
  subtitle: Localized | null;
  cta_label: Localized | null;
  cta_href: string | null;
  image_path: string;
};

export type Collection = {
  id: string;
  slug: string;
  title: Localized;
  description: Localized | null;
  image_path: string | null;
};
