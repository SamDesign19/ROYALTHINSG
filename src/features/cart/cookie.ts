import { z } from "zod";

// The cart is kept in the shopper's browser: product ids and quantities only. Prices, stock and
// delivery fees are always recomputed on the server (place_order()), so editing the cookie gains
// nothing. It is readable by JavaScript so the header can show the item count on cached pages.
export const CART_COOKIE = "ri_cart";
export const MAX_LINES = 50;
export const MAX_QUANTITY = 99;

export type CartItem = { id: string; qty: number };

const schema = z
  .array(z.tuple([z.guid(), z.number().int().min(1).max(MAX_QUANTITY)]))
  .max(MAX_LINES);

/** Parses the cookie value, dropping anything malformed instead of failing. */
export function parseCart(value: string | undefined | null): CartItem[] {
  if (!value) return [];
  try {
    // Server code receives the decoded value; document.cookie shows it URL-encoded.
    const text = value.startsWith("[") ? value : decodeURIComponent(value);
    const parsed = schema.safeParse(JSON.parse(text));
    if (!parsed.success) return [];
    const seen = new Set<string>();
    return parsed.data.flatMap(([id, qty]) => (seen.has(id) ? [] : (seen.add(id), [{ id, qty }])));
  } catch {
    return [];
  }
}

/** Plain JSON; the cookie API URL-encodes it when setting the header. */
export function serializeCart(items: CartItem[]): string {
  return JSON.stringify(items.slice(0, MAX_LINES).map((i) => [i.id, i.qty]));
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.qty, 0);
}

/** Adds `qty` to a line (creating it), capped at MAX_QUANTITY; new lines go first. */
export function addItem(items: CartItem[], id: string, qty: number): CartItem[] {
  const existing = items.find((i) => i.id === id);
  if (existing) return items.map((i) => (i.id === id ? { id, qty: Math.min(i.qty + qty, MAX_QUANTITY) } : i));
  return [{ id, qty: Math.min(Math.max(qty, 1), MAX_QUANTITY) }, ...items].slice(0, MAX_LINES);
}

/** Sets a line's quantity; 0 removes it. */
export function setItem(items: CartItem[], id: string, qty: number): CartItem[] {
  if (qty <= 0) return items.filter((i) => i.id !== id);
  return items.map((i) => (i.id === id ? { id, qty: Math.min(qty, MAX_QUANTITY) } : i));
}
