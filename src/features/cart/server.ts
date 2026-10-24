import "server-only";
import { cookies } from "next/headers";
import { CART_COOKIE, parseCart, serializeCart, type CartItem } from "./cookie";

export async function readCart(): Promise<CartItem[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function writeCart(items: CartItem[]) {
  const store = await cookies();
  if (items.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, serializeCart(items), {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false, // the header reads the count; the cookie holds no secret and no price
    maxAge: 60 * 60 * 24 * 30,
  });
}
