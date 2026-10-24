"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { readCart, writeCart } from "@/features/cart/server";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { normalizeDzPhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/server/supabase";
import { LAST_ORDER_COOKIE, type LastOrder } from "./last-order";

// Error codes raised by place_order() (supabase/migrations/*_functions.sql).
const KNOWN_ERRORS = [
  "invalid_name", "invalid_phone", "empty_cart", "too_many_items", "duplicate_items", "invalid_quantity",
  "delivery_unavailable", "invalid_commune", "address_required", "invalid_pickup_point", "product_unavailable",
  "insufficient_stock", "invalid_promo_code", "promo_minimum_not_met", "promo_limit_reached",
] as const;
export type CheckoutError = (typeof KNOWN_ERRORS)[number] | "rate_limited" | "unknown";
export type CheckoutState = { error?: CheckoutError; detail?: string; field?: string } | null;

const FIELD_OF: Partial<Record<CheckoutError, string>> = {
  invalid_name: "name", invalid_phone: "phone", invalid_commune: "commune", address_required: "address",
  invalid_pickup_point: "pickup", delivery_unavailable: "wilaya", invalid_promo_code: "promo",
  promo_minimum_not_met: "promo", promo_limit_reached: "promo",
};

const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const schema = z.object({
  locale: z.enum(routing.locales),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30),
  email: z.union([z.email().max(200), z.literal("")]).optional().transform((v) => v || undefined),
  company: text(200),
  method: z.enum(["home", "pickup"]),
  wilaya: z.coerce.number().int().min(1).max(99),
  commune: z.union([z.coerce.number().int().positive(), z.literal("")]).optional().transform((v) => (v === "" ? undefined : v)),
  address: text(300),
  pickup: z.union([z.guid(), z.literal("")]).optional().transform((v) => v || undefined),
  promo: text(40),
  note: text(1000),
  website: z.string().max(0).optional(), // honeypot: real visitors never fill it
});

function fail(error: CheckoutError, detail?: string): CheckoutState {
  return { error, detail, field: FIELD_OF[error] };
}

export async function placeOrder(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    if (field === "website") return fail("unknown");
    if (field === "name") return fail("invalid_name");
    if (field === "email") return { error: "unknown", field: "email" };
    return fail(field === "wilaya" || field === "method" ? "delivery_unavailable" : "unknown");
  }
  const f = parsed.data;
  const phone = normalizeDzPhone(f.phone);
  if (!phone) return fail("invalid_phone");
  if (f.method === "home" && !f.address) return fail("address_required");
  if (f.method === "pickup" && !f.pickup) return fail("invalid_pickup_point");

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`order:${ip}`, 5, 60_000)) return fail("rate_limited");

  const items = await readCart();
  if (items.length === 0) return fail("empty_cart");

  const { data, error } = await createPublicClient().rpc("place_order", {
    p_items: items.map((i) => ({ product_id: i.id, quantity: i.qty })),
    p_customer: { name: f.name, phone, email: f.email ?? null, company: f.company ?? null },
    p_delivery: {
      method: f.method,
      wilaya_code: f.wilaya,
      commune_id: f.commune ?? null,
      address_line: f.method === "home" ? f.address : null,
      pickup_point_id: f.method === "pickup" ? f.pickup : null,
    },
    p_promo_code: f.promo ?? null,
    p_note: f.note ?? null,
    p_locale: f.locale,
  });
  if (error) {
    const code = KNOWN_ERRORS.find((e) => e === error.message);
    if (!code) console.error("place_order failed", error);
    return fail(code ?? "unknown", error.details || undefined);
  }

  const order = data as { order_number: string; total_dzd: number };
  await writeCart([]);
  const confirmation: LastOrder = { number: order.order_number, total: Number(order.total_dzd), phone, method: f.method };
  (await cookies()).set(LAST_ORDER_COOKIE, JSON.stringify(confirmation), {
    path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60,
  });
  redirect({ href: `/checkout/confirmation/${encodeURIComponent(order.order_number)}`, locale: f.locale });
  return null;
}
