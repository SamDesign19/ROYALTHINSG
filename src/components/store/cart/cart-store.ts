"use client";

import { useSyncExternalStore } from "react";
import { CART_COOKIE, cartCount, parseCart } from "@/features/cart/cookie";

// The cart cookie is written by Server Actions; components re-read it when told the cart changed.
const EVENT = "ri:cart";

export function notifyCartChanged() {
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("focus", onChange);
  };
}

function readCount(): number {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CART_COOKIE}=`));
  return cartCount(parseCart(raw?.slice(CART_COOKIE.length + 1)));
}

/** Number of items in the cart; 0 during server rendering, so cached pages stay identical for everyone. */
export function useCartCount(): number {
  return useSyncExternalStore(subscribe, readCount, () => 0);
}
