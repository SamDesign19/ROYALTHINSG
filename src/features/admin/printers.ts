"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PRINTER_KINDS } from "@/features/catalog/types";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";
import type { ActionResult } from "./orders";

const slugify = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);

function refresh(productId?: string) {
  revalidatePath("/[locale]", "layout");
  revalidatePath("/admin/printers");
  if (productId) revalidatePath(`/admin/products/${productId}`);
}

/** Creates a printer model (and its series if new). The brand is flagged as a printer brand for "Find your ink". */
export async function createPrinter(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({
      brand_id: z.guid(),
      series_id: z.union([z.literal(""), z.guid()]).optional(),
      new_series: z.string().trim().max(80).optional(),
      model: z.string().trim().min(1).max(120),
      kind: z.enum(PRINTER_KINDS),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Marque, modèle et type sont obligatoires." };
  const f = parsed.data;
  const db = await createSessionClient();
  const { data: brand } = await db.from("brands").select("slug").eq("id", f.brand_id).single();
  let seriesId = f.series_id || null;
  if (!seriesId && f.new_series) {
    const { data, error } = await db
      .from("printer_series")
      .upsert({ brand_id: f.brand_id, name: f.new_series, slug: slugify(f.new_series) }, { onConflict: "brand_id,slug" })
      .select("id")
      .single();
    if (error) return { error: `Série : ${error.message}` };
    seriesId = data.id;
  }
  const { error } = await db.from("printers").insert({
    brand_id: f.brand_id,
    series_id: seriesId,
    model: f.model,
    kind: f.kind,
    slug: slugify(`${brand?.slug ?? ""}-${f.model}`),
  });
  if (error) return { error: /unique|duplicate/.test(error.message) ? "Ce modèle existe déjà." : `Erreur : ${error.message}` };
  await db.from("brands").update({ makes_printers: true }).eq("id", f.brand_id).eq("makes_printers", false);
  refresh();
  return { ok: `Imprimante « ${f.model} » ajoutée.` };
}

export async function togglePrinterActive(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z.object({ id: z.guid(), active: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Requête invalide." };
  const db = await createSessionClient();
  const { error } = await db.from("printers").update({ is_active: parsed.data.active === "true" }).eq("id", parsed.data.id);
  if (error) return { error: `Erreur : ${error.message}` };
  refresh();
  return { ok: "Imprimante mise à jour." };
}

/** Links a product to a printer. Only verified links are shown to shoppers. */
export async function linkPrinter(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const staff = await requireStaff();
  const parsed = z
    .object({
      product_id: z.guid(),
      printer: z.string().trim().min(1).max(200),
      verified: z.literal("on").optional().transform(Boolean),
      source: z.string().trim().max(200).optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Choisissez une imprimante dans la liste." };
  const f = parsed.data;
  const db = await createSessionClient();
  // The field holds the datalist label "Marque Modèle (slug)"; the slug identifies the printer.
  const slug = f.printer.match(/\(([a-z0-9-]+)\)\s*$/)?.[1] ?? f.printer;
  const { data: printer } = await db.from("printers").select("id, model").eq("slug", slug).maybeSingle();
  if (!printer) return { error: "Imprimante introuvable : choisissez-la dans la liste proposée." };
  const { error } = await db.from("product_compatibility").upsert(
    {
      product_id: f.product_id,
      printer_id: printer.id,
      verified: f.verified,
      verified_at: f.verified ? new Date().toISOString() : null,
      verified_by: f.verified ? staff.id : null,
      source: f.source || "Saisie admin",
    },
    { onConflict: "product_id,printer_id" },
  );
  if (error) return { error: `Erreur : ${error.message}` };
  refresh(f.product_id);
  return { ok: `${printer.model} ${f.verified ? "ajoutée (vérifiée)" : "ajoutée (non vérifiée, invisible en boutique)"}.` };
}

export async function setLinkVerified(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const staff = await requireStaff();
  const parsed = z.object({ product_id: z.guid(), printer_id: z.guid(), verified: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Requête invalide." };
  const verified = parsed.data.verified === "true";
  const db = await createSessionClient();
  const { error } = await db
    .from("product_compatibility")
    .update({ verified, verified_at: verified ? new Date().toISOString() : null, verified_by: verified ? staff.id : null })
    .eq("product_id", parsed.data.product_id)
    .eq("printer_id", parsed.data.printer_id);
  if (error) return { error: `Erreur : ${error.message}` };
  refresh(parsed.data.product_id);
  return { ok: verified ? "Lien vérifié : visible en boutique." : "Lien repassé en non vérifié." };
}

export async function unlinkPrinter(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z.object({ product_id: z.guid(), printer_id: z.guid() }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Requête invalide." };
  const db = await createSessionClient();
  const { error } = await db.from("product_compatibility").delete().eq("product_id", parsed.data.product_id).eq("printer_id", parsed.data.printer_id);
  if (error) return { error: `Erreur : ${error.message}` };
  refresh(parsed.data.product_id);
  return { ok: "Lien supprimé." };
}
