"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { normalizeDzPhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";
import { findGuestOrder, type GuestOrder } from "./queries";

export type TrackState = { order?: GuestOrder; error?: "not_found" | "rate_limited" } | null;

// Guest tracking by order number + phone (find_guest_order()). POST so the phone never lands in URLs or logs.
export async function trackOrder(_prev: TrackState, form: FormData): Promise<TrackState> {
  const number = z.string().trim().min(3).max(40).safeParse(form.get("number"));
  const phone = normalizeDzPhone(String(form.get("phone") ?? ""));
  if (!number.success || !phone) return { error: "not_found" };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`track:${ip}`, 10, 60_000)) return { error: "rate_limited" };
  const order = await findGuestOrder(number.data, phone);
  return order ? { order } : { error: "not_found" };
}
