import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, PrintButton } from "@/components/admin/forms";
import { Card, PageHeader, Pill, ORDER_STATUS, Table } from "@/components/admin/ui";
import { da, dateTime } from "@/features/admin/format";
import { changeOrderStatus, saveInternalNote } from "@/features/admin/orders";
import { pick, type Localized } from "@/lib/localized";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";

export const metadata: Metadata = { title: "Commande" };

// Mirrors order_transition_allowed() in the database.
const NEXT: Record<string, { status: string; label: string; variant: "primary" | "secondary"; confirm?: string }[]> = {
  pending: [
    { status: "confirmed", label: "Confirmer (après appel)", variant: "primary" },
    { status: "cancelled", label: "Annuler", variant: "secondary", confirm: "Annuler cette commande ? Le stock sera remis en rayon." },
  ],
  confirmed: [
    { status: "processing", label: "Passer en préparation", variant: "primary" },
    { status: "cancelled", label: "Annuler", variant: "secondary", confirm: "Annuler cette commande ? Le stock sera remis en rayon." },
  ],
  processing: [
    { status: "shipped", label: "Marquer expédiée", variant: "primary" },
    { status: "cancelled", label: "Annuler", variant: "secondary", confirm: "Annuler cette commande ? Le stock sera remis en rayon." },
  ],
  shipped: [
    { status: "delivered", label: "Marquer livrée (payée)", variant: "primary" },
    { status: "returned", label: "Retour", variant: "secondary", confirm: "Marquer comme retournée ? Le stock n'est pas remis automatiquement." },
  ],
  delivered: [{ status: "returned", label: "Retour", variant: "secondary", confirm: "Marquer comme retournée ? Le stock n'est pas remis automatiquement." }],
};

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createSessionClient();
  const { data: o } = await db
    .from("orders")
    .select("*, wilaya:wilayas(code, name), commune:communes(name, postal_code), pickup:pickup_points(name, address), promo:promo_codes(code), items:order_items(id, sku, name, unit_price_dzd, quantity, line_total_dzd, product_id), history:order_status_history(status, note, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();
  const { data: store } = await db.from("settings").select("value").eq("key", "store").maybeSingle();
  const s = (store?.value ?? {}) as Record<string, string>;
  const history = [...(o.history as { status: string; note: string | null; created_at: string }[])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const st = ORDER_STATUS[o.status];

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={`Commande ${o.order_number}`}
          description={<>Passée le {dateTime(o.created_at)} · <Pill tone={st?.tone}>{st?.label}</Pill> · Paiement {o.payment_status === "paid" ? "reçu" : "à la livraison"}</>}
          actions={<><PrintButton /><Link href="/admin/orders" className="inline-flex min-h-9 items-center px-3 text-sm hover:underline">Retour</Link></>}
        />
      </div>

      {/* Printable header: order form, or invoice once the order is confirmed (invoice number issued by the database). */}
      <div className="mb-6 hidden print:block">
        <p className="text-xl font-semibold">{s.name ?? "ROYAL INK"}</p>
        {[s.address, s.phone, s.nif && `NIF ${s.nif}`, s.rc && `RC ${s.rc}`, s.nis && `NIS ${s.nis}`, s.ai && `AI ${s.ai}`].filter(Boolean).map((l) => <p key={l} className="text-sm">{l}</p>)}
        <p className="mt-4 text-lg font-semibold">{o.invoice_number ? `Facture ${o.invoice_number}` : "Bon de commande"} · {o.order_number} · {dateTime(o.created_at)}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Articles">
            <Table>
              <thead><tr><th>Réf.</th><th>Produit</th><th className="text-end">P.U.</th><th className="text-end">Qté</th><th className="text-end">Total</th></tr></thead>
              <tbody>
                {(o.items as { id: number; sku: string; name: Localized; unit_price_dzd: number; quantity: number; line_total_dzd: number; product_id: string | null }[]).map((i) => (
                  <tr key={i.id}>
                    <td className="whitespace-nowrap text-ink-2">{i.sku}</td>
                    <td>{i.product_id ? <Link href={`/admin/products/${i.product_id}`} className="hover:underline">{pick(i.name, "fr")}</Link> : pick(i.name, "fr")}</td>
                    <td className="whitespace-nowrap text-end">{da(i.unit_price_dzd)}</td>
                    <td className="text-end tabular-nums">{i.quantity}</td>
                    <td className="whitespace-nowrap text-end font-medium">{da(i.line_total_dzd)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ms-auto mt-4 w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-ink-2">Sous-total</dt><dd>{da(o.subtotal_dzd)}</dd></div>
              {Number(o.discount_dzd) > 0 ? <div className="flex justify-between"><dt className="text-ink-2">Remise {(o.promo as { code: string } | null)?.code}</dt><dd>− {da(o.discount_dzd)}</dd></div> : null}
              <div className="flex justify-between"><dt className="text-ink-2">Livraison</dt><dd>{Number(o.delivery_fee_dzd) === 0 ? "Gratuite" : da(o.delivery_fee_dzd)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total à encaisser</dt><dd>{da(o.total_dzd)}</dd></div>
            </dl>
          </Card>

          <Card title="Client et livraison">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div><dt className="text-ink-2">Nom</dt><dd className="font-medium">{o.customer_name}{o.company_name ? ` · ${o.company_name}` : ""}</dd></div>
              <div><dt className="text-ink-2">Téléphone</dt><dd><a href={`tel:${o.customer_phone}`} className="font-medium tabular-nums hover:underline">{o.customer_phone}</a></dd></div>
              {o.customer_email ? <div><dt className="text-ink-2">E-mail</dt><dd>{o.customer_email}</dd></div> : null}
              <div><dt className="text-ink-2">Wilaya</dt><dd>{String(o.wilaya_code).padStart(2, "0")} {pick((o.wilaya as { name: Localized } | null)?.name, "fr")}{o.commune ? ` · ${pick((o.commune as { name: Localized }).name, "fr")}` : ""}</dd></div>
              <div className="sm:col-span-2"><dt className="text-ink-2">{o.delivery_method === "home" ? "Livraison à domicile" : "Point relais"}</dt>
                <dd>{o.delivery_method === "home" ? o.address_line : `${(o.pickup as { name: string; address: string } | null)?.name} — ${(o.pickup as { name: string; address: string } | null)?.address}`}</dd></div>
              {o.customer_note ? <div className="sm:col-span-2"><dt className="text-ink-2">Remarque du client</dt><dd className="whitespace-pre-line">{o.customer_note}</dd></div> : null}
              <div><dt className="text-ink-2">Langue</dt><dd>{({ ar: "Arabe", fr: "Français", en: "Anglais" } as Record<string, string>)[o.locale] ?? o.locale}</dd></div>
              {o.invoice_number ? <div><dt className="text-ink-2">Facture</dt><dd className="font-medium">{o.invoice_number}</dd></div> : null}
            </dl>
          </Card>
        </div>

        <div className="space-y-6 print:hidden">
          <Card title="Actions">
            {(NEXT[o.status] ?? []).length === 0 ? (
              <p className="text-sm text-ink-2">Aucune action : commande {st?.label.toLowerCase()}.</p>
            ) : (
              <div className="space-y-4">
                {(NEXT[o.status] ?? []).map((t) => (
                  <ActionForm key={t.status} action={changeOrderStatus} submit={t.label} variant={t.variant} confirm={t.confirm}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="status" value={t.status} />
                  </ActionForm>
                ))}
                <p className="text-xs text-ink-2">La confirmation attribue un numéro de facture. L&apos;annulation remet le stock en rayon. « Livrée » marque le paiement comme reçu.</p>
              </div>
            )}
          </Card>
          <Card title="Note interne">
            <ActionForm action={saveInternalNote} submit="Enregistrer" variant="secondary">
              <input type="hidden" name="id" value={o.id} />
              <textarea name="note" defaultValue={o.internal_note ?? ""} rows={3} maxLength={2000} aria-label="Note interne" className="w-full rounded-control border border-line bg-bg p-3 text-sm focus-visible:border-ink focus-visible:outline-none" />
            </ActionForm>
          </Card>
          <Card title="Historique">
            <ol className="space-y-2 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-32 shrink-0 text-ink-2">{dateTime(h.created_at)}</span>
                  <span>{ORDER_STATUS[h.status]?.label}{h.note ? ` — ${h.note}` : ""}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
