"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";

export type ActionResult = { ok?: string; error?: string } | null;

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"] as const;

const ERRORS: Record<string, string> = {
  invalid_transition: "Ce changement de statut n'est pas autorisé depuis le statut actuel.",
  forbidden: "Action réservée à l'équipe.",
  order_not_found: "Commande introuvable.",
};

/** Moves an order through the workflow with set_order_status() (restock on cancel, invoice number on confirm). */
export async function changeOrderStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z
    .object({ id: z.guid(), status: z.enum(STATUSES), note: z.string().trim().max(500).optional() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Requête invalide." };
  const db = await createSessionClient();
  const { error } = await db.rpc("set_order_status", { p_order: parsed.data.id, p_status: parsed.data.status, p_note: parsed.data.note || null });
  if (error) return { error: ERRORS[error.message] ?? `Erreur : ${error.message}` };
  revalidatePath(`/admin/orders/${parsed.data.id}`);
  revalidatePath("/admin/orders");
  return { ok: "Statut mis à jour." };
}

export async function saveInternalNote(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = z.object({ id: z.guid(), note: z.string().trim().max(2000) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Note trop longue." };
  const db = await createSessionClient();
  const { error } = await db.from("orders").update({ internal_note: parsed.data.note || null }).eq("id", parsed.data.id);
  if (error) return { error: `Erreur : ${error.message}` };
  revalidatePath(`/admin/orders/${parsed.data.id}`);
  return { ok: "Note enregistrée." };
}
