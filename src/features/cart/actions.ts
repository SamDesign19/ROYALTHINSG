"use server";

import { z } from "zod";
import { addItem, MAX_QUANTITY, setItem } from "./cookie";
import { readCart, writeCart } from "./server";

const id = z.guid();
const qty = z.number().int().min(0).max(MAX_QUANTITY);

export async function addToCart(productId: string, quantity = 1) {
  const p = id.safeParse(productId);
  const q = qty.min(1).safeParse(quantity);
  if (!p.success || !q.success) return { ok: false as const };
  await writeCart(addItem(await readCart(), p.data, q.data));
  return { ok: true as const };
}

export async function updateCartItem(productId: string, quantity: number) {
  const p = id.safeParse(productId);
  const q = qty.safeParse(quantity);
  if (!p.success || !q.success) return { ok: false as const };
  await writeCart(setItem(await readCart(), p.data, q.data));
  return { ok: true as const };
}
