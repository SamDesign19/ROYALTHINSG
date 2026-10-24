"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";
import type { ActionResult } from "./orders";

const slugify = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const on = z.literal("on").optional().transform(Boolean);
const refreshStore = () => revalidatePath("/[locale]", "layout");

// ---------------------------------------------------------------------------
// Brands and categories
// ---------------------------------------------------------------------------

export async function saveBrand(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({ id: z.union([z.literal(""), z.guid()]).optional(), name: z.string().trim().min(1).max(80), makes_printers: on, is_active: on })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Nom de marque requis." };
  const { id, name, makes_printers, is_active } = parsed.data;
  const db = await createSessionClient();
  const res = id
    ? await db.from("brands").update({ name, makes_printers, is_active }).eq("id", id)
    : await db.from("brands").insert({ name, slug: slugify(name), makes_printers, is_active: true });
  if (res.error) return { error: /duplicate|unique/.test(res.error.message) ? "Cette marque existe déjà." : `Erreur : ${res.error.message}` };
  refreshStore();
  revalidatePath("/admin/catalog");
  return { ok: id ? "Marque enregistrée." : `Marque « ${name} » créée.` };
}

export async function saveCategory(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({
      id: z.guid(),
      fr: z.string().trim().max(80), ar: z.string().trim().max(80), en: z.string().trim().max(80),
      sort_order: z.coerce.number().int().min(0).max(999),
      is_active: on,
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Valeurs invalides." };
  const f = parsed.data;
  const name = Object.fromEntries(Object.entries({ fr: f.fr, ar: f.ar, en: f.en }).filter(([, v]) => v));
  if (!Object.keys(name).length) return { error: "Au moins un nom est requis." };
  const db = await createSessionClient();
  const { error } = await db.from("categories").update({ name, sort_order: f.sort_order, is_active: f.is_active }).eq("id", f.id);
  if (error) return { error: `Erreur : ${error.message}` };
  refreshStore();
  revalidatePath("/admin/catalog");
  return { ok: "Catégorie enregistrée." };
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

const fee = z.union([z.literal(""), z.coerce.number().min(0).max(1_000_000)]).optional().transform((v) => (v === "" || v === undefined ? null : v));
const days = z.union([z.literal(""), z.coerce.number().int().min(0).max(60)]).optional().transform((v) => (v === "" || v === undefined ? null : v));

/**
 * Saves the rate table: one row per wilaya and method. An empty fee removes the rate, which closes
 * that method for that wilaya at checkout (a wilaya without any rate cannot be chosen).
 */
export async function saveDeliveryRates(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const codes = form.getAll("code").map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 99);
  const upserts: Record<string, unknown>[] = [];
  const removals: { wilaya_code: number; method: string }[] = [];
  for (const code of codes) {
    for (const method of ["home", "pickup"] as const) {
      const f = fee.safeParse(form.get(`${method}_${code}`) ?? "");
      if (!f.success) return { error: `Frais invalide (wilaya ${code}).` };
      const free = fee.safeParse(form.get(`free_${code}`) ?? "");
      const min = days.safeParse(form.get(`min_${code}`) ?? "");
      const max = days.safeParse(form.get(`max_${code}`) ?? "");
      if (!free.success || !min.success || !max.success) return { error: `Valeurs invalides (wilaya ${code}).` };
      if (f.data === null) {
        removals.push({ wilaya_code: code, method });
        continue;
      }
      const etaMin = min.data, etaMax = max.data !== null && min.data !== null && max.data < min.data ? min.data : max.data;
      upserts.push({ wilaya_code: code, method, fee_dzd: f.data, free_over_dzd: free.data || null, eta_min_days: etaMin, eta_max_days: etaMax, is_active: true });
    }
  }
  const db = await createSessionClient();
  if (upserts.length) {
    const { error } = await db.from("delivery_rates").upsert(upserts, { onConflict: "wilaya_code,method" });
    if (error) return { error: `Erreur : ${error.message}` };
  }
  for (const r of removals) await db.from("delivery_rates").delete().eq("wilaya_code", r.wilaya_code).eq("method", r.method);
  revalidatePath("/admin/delivery");
  return { ok: `${upserts.length} tarif(s) enregistré(s), ${new Set(upserts.map((u) => u.wilaya_code)).size} wilaya(s) ouvertes à la commande.` };
}

export async function savePickupPoint(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({
      id: z.union([z.literal(""), z.guid()]).optional(),
      wilaya_code: z.coerce.number().int().min(1).max(99),
      name: z.string().trim().min(1).max(120),
      address: z.string().trim().min(1).max(300),
      phone: z.string().trim().max(30).optional(),
      opening_hours: z.string().trim().max(120).optional(),
      is_active: on,
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Wilaya, nom et adresse sont obligatoires." };
  const { id, ...row } = parsed.data;
  const db = await createSessionClient();
  const res = id
    ? await db.from("pickup_points").update({ ...row, phone: row.phone || null, opening_hours: row.opening_hours || null }).eq("id", id)
    : await db.from("pickup_points").insert({ ...row, phone: row.phone || null, opening_hours: row.opening_hours || null, is_active: true });
  if (res.error) return { error: `Erreur : ${res.error.message}` };
  revalidatePath("/admin/delivery");
  return { ok: id ? "Point relais enregistré." : "Point relais ajouté. Pensez au tarif « Point relais » pour sa wilaya." };
}

// ---------------------------------------------------------------------------
// Promo codes
// ---------------------------------------------------------------------------

export async function savePromo(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/),
      kind: z.enum(["percent", "fixed", "free_shipping"]),
      value: z.coerce.number().min(0).max(10_000_000),
      min_subtotal_dzd: z.union([z.literal(""), z.coerce.number().min(0)]).optional().transform((v) => (v === "" || v === undefined ? 0 : v)),
      max_uses: z.union([z.literal(""), z.coerce.number().int().min(1)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
      per_customer_limit: z.union([z.literal(""), z.coerce.number().int().min(1)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
      ends_at: z.union([z.literal(""), z.iso.date()]).optional().transform((v) => (v ? `${v}T23:59:59+01:00` : null)),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Code (3 à 30 lettres/chiffres) et valeur requis." };
  if (parsed.data.kind === "percent" && parsed.data.value > 100) return { error: "Un pourcentage ne peut pas dépasser 100." };
  const db = await createSessionClient();
  const { error } = await db.from("promo_codes").insert(parsed.data);
  if (error) return { error: /duplicate|unique/.test(error.message) ? "Ce code existe déjà." : `Erreur : ${error.message}` };
  revalidatePath("/admin/promos");
  return { ok: `Code ${parsed.data.code} créé.` };
}

export async function togglePromo(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z.object({ id: z.guid(), active: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Requête invalide." };
  const db = await createSessionClient();
  const { error } = await db.from("promo_codes").update({ is_active: parsed.data.active === "true" }).eq("id", parsed.data.id);
  if (error) return { error: `Erreur : ${error.message}` };
  revalidatePath("/admin/promos");
  return { ok: parsed.data.active === "true" ? "Code activé." : "Code désactivé." };
}
