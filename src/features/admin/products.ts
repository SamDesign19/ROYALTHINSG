"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { INK_COLORS, ORIGINS, PRODUCT_TYPES, YIELD_TYPES } from "@/features/catalog/types";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";
import type { ActionResult } from "./orders";

/** Product pages are cached (ISR); refresh every locale's copy after a change. */
function refreshStorefront() {
  revalidatePath("/[locale]", "layout");
}

const ids = z.array(z.guid()).min(1).max(500);

export type SaveResult = { ok?: string; error?: string; id?: string } | null;

export async function bulkProducts(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const op = z.enum(["publish", "draft", "archive", "feature", "unfeature"]).safeParse(form.get("op"));
  const selected = ids.safeParse(form.getAll("id"));
  if (!op.success || !selected.success) return { error: "Sélectionnez au moins un produit." };
  const db = await createSessionClient();
  if (op.data === "publish") {
    // A product can only go online with a real price (database constraint): skip those without one.
    const { data, error } = await db.from("products").update({ status: "active" }).in("id", selected.data).not("price_dzd", "is", null).gt("price_dzd", 0).select("id");
    if (error) return { error: `Erreur : ${error.message}` };
    refreshStorefront();
    revalidatePath("/admin/products");
    const skipped = selected.data.length - (data?.length ?? 0);
    return { ok: `${data?.length ?? 0} produit(s) mis en ligne.${skipped ? ` ${skipped} ignoré(s) : prix manquant.` : ""}` };
  }
  const patch =
    op.data === "draft" ? { status: "draft" } : op.data === "archive" ? { status: "archived" } : { is_featured: op.data === "feature" };
  const { data, error } = await db.from("products").update(patch).in("id", selected.data).select("id");
  if (error) return { error: `Erreur : ${error.message}` };
  refreshStorefront();
  revalidatePath("/admin/products");
  return { ok: `${data?.length ?? 0} produit(s) mis à jour.` };
}

const opt = z.string().trim().max(5000).optional().transform((v) => v || null);
const num = (max: number) => z.union([z.literal(""), z.coerce.number().min(0).max(max)]).optional().transform((v) => (v === "" || v === undefined ? null : v));
const int = (max: number) => z.union([z.literal(""), z.coerce.number().int().min(1).max(max)]).optional().transform((v) => (v === "" || v === undefined ? null : v));
const enumOrNull = <T extends readonly [string, ...string[]]>(values: T) => z.union([z.literal(""), z.enum(values)]).optional().transform((v) => (v ? v : null));

const productSchema = z.object({
  id: z.union([z.literal(""), z.guid()]).optional(),
  sku: z.string().trim().min(1).max(60),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug").max(120),
  name_fr: opt, name_ar: opt, name_en: opt,
  short_fr: opt, short_ar: opt, short_en: opt,
  desc_fr: opt, desc_ar: opt, desc_en: opt,
  product_type: z.enum(PRODUCT_TYPES),
  category_id: z.guid(),
  brand_id: z.union([z.literal(""), z.guid()]).optional().transform((v) => v || null),
  model_code: opt, oem_reference: opt,
  origin: enumOrNull(ORIGINS), color: enumOrNull(INK_COLORS), yield_type: enumOrNull(YIELD_TYPES),
  page_yield: int(10_000_000), volume_ml: num(100_000), pack_size: int(1000).transform((v) => v ?? 1),
  price_dzd: num(100_000_000), compare_at_dzd: num(100_000_000), weight_grams: int(1_000_000),
  status: z.enum(["draft", "active", "archived"]),
  is_featured: z.literal("on").optional().transform(Boolean),
  specs: z.string().max(5000).optional(),
});

function localized(ar: string | null, fr: string | null, en: string | null) {
  const o = Object.fromEntries(Object.entries({ ar, fr, en }).filter(([, v]) => v));
  return Object.keys(o).length ? o : null;
}

/** "Clé: valeur" lines -> {"Clé": "valeur"}. */
function parseSpecs(text: string | undefined) {
  const out: Record<string, string> = {};
  for (const line of (text ?? "").split("\n")) {
    const i = line.indexOf(":");
    if (i > 0 && line.slice(i + 1).trim()) out[line.slice(0, i).trim().slice(0, 80)] = line.slice(i + 1).trim().slice(0, 300);
  }
  return out;
}

const DB_ERRORS: [RegExp, string][] = [
  [/products_sku_key/, "Cette référence (SKU) existe déjà."],
  [/products_slug_key/, "Cette adresse (slug) est déjà utilisée."],
  [/products_check|price_dzd is not null/, "Un produit en ligne doit avoir un prix."],
  [/name_check|is_localized/, "Le nom est obligatoire (au moins une langue)."],
];

export async function saveProduct(_prev: SaveResult, form: FormData): Promise<SaveResult> {
  await requireStaff();
  const parsed = productSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { error: field === "slug" ? "Adresse (slug) invalide : lettres minuscules, chiffres et tirets." : `Champ invalide : ${field}.` };
  }
  const f = parsed.data;
  const name = localized(f.name_ar, f.name_fr, f.name_en);
  if (!name) return { error: "Le nom est obligatoire (au moins une langue)." };
  if (f.status === "active" && !f.price_dzd) return { error: "Un produit en ligne doit avoir un prix." };
  const row = {
    sku: f.sku, slug: f.slug, name,
    short_description: localized(f.short_ar, f.short_fr, f.short_en),
    description: localized(f.desc_ar, f.desc_fr, f.desc_en),
    product_type: f.product_type, category_id: f.category_id, brand_id: f.brand_id,
    model_code: f.model_code, oem_reference: f.oem_reference, origin: f.origin, color: f.color, yield_type: f.yield_type,
    page_yield: f.page_yield, volume_ml: f.volume_ml, pack_size: f.pack_size,
    price_dzd: f.price_dzd, compare_at_dzd: f.compare_at_dzd, weight_grams: f.weight_grams,
    status: f.status, is_featured: f.is_featured,
  };
  const db = await createSessionClient();
  // Keep keys the form does not edit (e.g. import_category) when updating the specifications.
  let specs = parseSpecs(f.specs);
  if (f.id) {
    const { data: current } = await db.from("products").select("specs").eq("id", f.id).maybeSingle();
    const hidden = Object.fromEntries(Object.entries((current?.specs ?? {}) as Record<string, unknown>).filter(([k]) => k.startsWith("import_")));
    specs = { ...hidden, ...specs } as Record<string, string>;
  }
  const res = f.id
    ? await db.from("products").update({ ...row, specs }).eq("id", f.id).select("id").single()
    : await db.from("products").insert({ ...row, specs }).select("id").single();
  if (res.error) {
    const msg = DB_ERRORS.find(([re]) => re.test(res.error.message))?.[1];
    return { error: msg ?? `Erreur : ${res.error.message}` };
  }
  refreshStorefront();
  revalidatePath("/admin/products");
  return { ok: f.id ? "Produit enregistré." : "Produit créé.", id: res.data.id };
}

export async function adjustStock(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({
      id: z.guid(),
      delta: z.coerce.number().int().min(-100000).max(100000).refine((n) => n !== 0),
      reason: z.enum(["purchase", "adjustment", "return", "damage", "initial"]),
      note: z.string().trim().max(300).optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Indiquez une quantité non nulle (ex. 10 ou -2)." };
  const db = await createSessionClient();
  const { data, error } = await db.rpc("adjust_stock", { p_product: parsed.data.id, p_delta: parsed.data.delta, p_reason: parsed.data.reason, p_note: parsed.data.note || null });
  if (error) return { error: error.message === "insufficient_stock" ? "Le stock ne peut pas devenir négatif." : `Erreur : ${error.message}` };
  refreshStorefront();
  revalidatePath(`/admin/products/${parsed.data.id}`);
  revalidatePath("/admin/inventory");
  return { ok: `Stock mis à jour : ${data} en stock.` };
}

export async function saveLowStockThreshold(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z.object({ id: z.guid(), threshold: z.coerce.number().int().min(0).max(100000) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Seuil invalide." };
  const db = await createSessionClient();
  const { error } = await db.from("inventory").update({ low_stock_threshold: parsed.data.threshold }).eq("product_id", parsed.data.id);
  if (error) return { error: `Erreur : ${error.message}` };
  revalidatePath(`/admin/products/${parsed.data.id}`);
  return { ok: "Seuil enregistré." };
}

export async function savePriceTier(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({ id: z.guid(), min_quantity: z.coerce.number().int().min(2).max(100000), price_dzd: z.coerce.number().min(0), business_only: z.literal("on").optional().transform(Boolean) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Quantité minimale (≥ 2) et prix requis." };
  const db = await createSessionClient();
  const { error } = await db.from("price_tiers").upsert(
    { product_id: parsed.data.id, min_quantity: parsed.data.min_quantity, price_dzd: parsed.data.price_dzd, business_only: parsed.data.business_only },
    { onConflict: "product_id,min_quantity,business_only" },
  );
  if (error) return { error: `Erreur : ${error.message}` };
  refreshStorefront();
  revalidatePath(`/admin/products/${parsed.data.id}`);
  return { ok: "Palier enregistré." };
}

export async function deletePriceTier(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z.object({ id: z.guid(), tier: z.guid() }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Requête invalide." };
  const db = await createSessionClient();
  const { error } = await db.from("price_tiers").delete().eq("id", parsed.data.tier);
  if (error) return { error: `Erreur : ${error.message}` };
  refreshStorefront();
  revalidatePath(`/admin/products/${parsed.data.id}`);
  return { ok: "Palier supprimé." };
}
