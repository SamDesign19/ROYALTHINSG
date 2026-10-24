import "server-only";
import type { Localized } from "@/lib/localized";
import { createPublicClient } from "@/server/supabase";

export type DeliveryMethod = "home" | "pickup";
export type DeliveryRate = { method: DeliveryMethod; fee_dzd: number; free_over_dzd: number | null; eta_min_days: number | null; eta_max_days: number | null };
export type WilayaOption = { code: number; name: Localized; rates: DeliveryRate[] };
export type PickupPoint = { id: string; wilaya_code: number; name: string; address: string; opening_hours: string | null };

/** Wilayas that have at least one active delivery rate, with their rates and pickup points. */
export async function getDeliveryOptions(): Promise<{ wilayas: WilayaOption[]; pickupPoints: PickupPoint[] }> {
  const client = createPublicClient();
  const [wilayas, rates, points] = await Promise.all([
    client.from("wilayas").select("code, name").order("code"),
    client.from("delivery_rates").select("wilaya_code, method, fee_dzd, free_over_dzd, eta_min_days, eta_max_days"),
    client.from("pickup_points").select("id, wilaya_code, name, address, opening_hours").order("name"),
  ]);
  for (const r of [wilayas, rates, points]) if (r.error) throw new Error(`Failed to load delivery options: ${r.error.message}`);
  const byWilaya = new Map<number, DeliveryRate[]>();
  for (const r of (rates.data ?? []) as (DeliveryRate & { wilaya_code: number })[]) {
    const { wilaya_code, ...rate } = r;
    byWilaya.set(wilaya_code, [...(byWilaya.get(wilaya_code) ?? []), { ...rate, fee_dzd: Number(rate.fee_dzd), free_over_dzd: rate.free_over_dzd === null ? null : Number(rate.free_over_dzd) }]);
  }
  return {
    wilayas: ((wilayas.data ?? []) as { code: number; name: Localized }[])
      .filter((w) => byWilaya.has(w.code))
      .map((w) => ({ ...w, rates: byWilaya.get(w.code)! })),
    pickupPoints: (points.data ?? []) as PickupPoint[],
  };
}

export async function getCommunes(wilaya: number) {
  const { data, error } = await createPublicClient()
    .from("communes")
    .select("id, name, postal_code")
    .eq("wilaya_code", wilaya)
    .limit(200);
  if (error) throw new Error(`Failed to load communes: ${error.message}`);
  const list = (data ?? []) as { id: number; name: Localized; postal_code: string | null }[];
  return list.sort((a, b) => (a.name.fr ?? "").localeCompare(b.name.fr ?? "", "fr"));
}

export type GuestOrder = { order_number: string; status: string; total_dzd: number; created_at: string; history: { status: string; at: string }[] | null };

export async function findGuestOrder(number: string, phone: string): Promise<GuestOrder | null> {
  const { data, error } = await createPublicClient().rpc("find_guest_order", { p_order_number: number, p_phone: phone });
  if (error) throw new Error(`Order lookup failed: ${error.message}`);
  return ((data ?? []) as GuestOrder[])[0] ?? null;
}
