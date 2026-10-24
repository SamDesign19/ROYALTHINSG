import "server-only";
import { getAvailability } from "@/features/catalog/queries";
import type { ProductCardData } from "@/features/catalog/types";
import { createPublicClient } from "@/server/supabase";
import type { CartItem } from "./cookie";

export type CartLine = {
  id: string;
  qty: number;
  product: Pick<ProductCardData, "slug" | "sku" | "name" | "model_code" | "product_type" | "origin" | "brand_name" | "image_path"> | null;
  unitPrice: number | null;
  lineTotal: number;
  status: "ok" | "unavailable" | "out_of_stock";
};

type Row = {
  id: string; slug: string; sku: string; name: ProductCardData["name"]; model_code: string | null;
  product_type: ProductCardData["product_type"]; origin: ProductCardData["origin"]; price_dzd: number | null;
  brand: { name: string } | null; images: { storage_path: string; position: number }[];
};

/**
 * Cart lines with current prices. Unit prices come from unit_price() (volume tiers included), the
 * same function place_order() uses, so the cart matches what the order will charge.
 */
export async function getCartLines(items: CartItem[]): Promise<{ lines: CartLine[]; subtotal: number; orderable: boolean }> {
  if (items.length === 0) return { lines: [], subtotal: 0, orderable: false };
  const client = createPublicClient();
  const ids = items.map((i) => i.id);
  const { data, error } = await client
    .from("products")
    .select("id, slug, sku, name, model_code, product_type, origin, price_dzd, brand:brands(name), images:product_images(storage_path, position)")
    .in("id", ids)
    .eq("status", "active");
  if (error) throw new Error(`Failed to load cart: ${error.message}`);
  const rows = new Map(((data ?? []) as unknown as Row[]).map((r) => [r.id, r]));
  const availability = await getAvailability([...rows.keys()]);

  const lines = await Promise.all(
    items.map(async (item): Promise<CartLine> => {
      const row = rows.get(item.id);
      if (!row || row.price_dzd === null) return { ...item, product: null, unitPrice: null, lineTotal: 0, status: "unavailable" };
      const { data: price } = await client.rpc("unit_price", { p_product: item.id, p_quantity: item.qty });
      const unitPrice = Number(price ?? row.price_dzd);
      return {
        ...item,
        product: {
          slug: row.slug, sku: row.sku, name: row.name, model_code: row.model_code, product_type: row.product_type,
          origin: row.origin, brand_name: row.brand?.name ?? null,
          image_path: [...row.images].sort((a, b) => a.position - b.position)[0]?.storage_path ?? null,
        },
        unitPrice,
        lineTotal: Math.round(unitPrice * item.qty * 100) / 100,
        status: availability.get(item.id)?.in_stock ? "ok" : "out_of_stock",
      };
    }),
  );
  return {
    lines,
    subtotal: lines.reduce((s, l) => s + (l.status === "ok" ? l.lineTotal : 0), 0),
    orderable: lines.length > 0 && lines.every((l) => l.status === "ok"),
  };
}
