import { BadgeCheck, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/forms";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { Card, PageHeader, Pill, PRODUCT_STATUS } from "@/components/admin/ui";
import { Checkbox, Input, Label, Select } from "@/components/ui/field";
import { da, dateTime } from "@/features/admin/format";
import { adjustStock, deletePriceTier, saveLowStockThreshold, savePriceTier } from "@/features/admin/products";
import { linkPrinter, setLinkVerified, unlinkPrinter } from "@/features/admin/printers";
import { brandOptions, categoryOptions } from "@/features/admin/queries";
import { pick } from "@/lib/localized";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";

export const metadata: Metadata = { title: "Produit" };

const REASONS: Record<string, string> = {
  initial: "Stock initial", purchase: "Réception fournisseur", sale: "Vente", adjustment: "Ajustement (inventaire)",
  return: "Retour client", cancellation: "Annulation de commande", damage: "Casse / perte",
};

export default async function ProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createSessionClient();
  const [{ data: product }, categories, brands, { data: inventory }, { data: movements }, { data: tiers }, { data: links }, { data: printers }] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle(),
    categoryOptions(),
    brandOptions(),
    db.from("inventory").select("quantity, low_stock_threshold").eq("product_id", id).maybeSingle(),
    db.from("inventory_movements").select("id, delta, quantity_after, reason, note, created_at").eq("product_id", id).order("created_at", { ascending: false }).limit(15),
    db.from("price_tiers").select("id, min_quantity, price_dzd, business_only").eq("product_id", id).order("min_quantity"),
    db.from("product_compatibility").select("printer_id, verified, source, printer:printers(model, slug, brand:brands(name))").eq("product_id", id),
    db.from("printers").select("slug, model, brand:brands(name)").eq("is_active", true).order("model").limit(5000),
  ]);
  if (!product) notFound();
  const p = product as ProductFormValues & { id: string; slug: string; status: string; updated_at: string };
  type Link = { printer_id: string; verified: boolean; source: string | null; printer: { model: string; slug: string; brand: { name: string } } };
  const linkRows = ((links ?? []) as unknown as Link[]).sort((a, b) => `${a.printer.brand.name}${a.printer.model}`.localeCompare(`${b.printer.brand.name}${b.printer.model}`));
  const printerOptions = (printers ?? []) as unknown as { slug: string; model: string; brand: { name: string } }[];

  return (
    <>
      <PageHeader
        title={pick(p.name, "fr") || p.sku}
        description={<><Pill tone={PRODUCT_STATUS[p.status]?.tone}>{PRODUCT_STATUS[p.status]?.label}</Pill> · {p.sku} · modifié le {dateTime(p.updated_at)}</>}
        actions={
          <>
            {p.status === "active" ? (
              <a href={`/fr/p/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 px-3 text-sm hover:underline">
                Voir en boutique <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : null}
            <Link href="/admin/products" className="inline-flex min-h-9 items-center px-3 text-sm hover:underline">Retour</Link>
          </>
        }
      />
      <div className="grid gap-6 2xl:grid-cols-[1fr_24rem]">
        <ProductForm product={p} categories={categories} brands={brands} />

        <div className="space-y-6">
          <Card title={`Stock : ${inventory?.quantity ?? 0}`}>
            <ActionForm action={adjustStock} submit="Enregistrer le mouvement" resetOnSuccess>
              <input type="hidden" name="id" value={p.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="delta" className="text-xs text-ink-2">Quantité (+ entrée, − sortie)</Label>
                  <Input id="delta" name="delta" type="number" required placeholder="10 ou -2" />
                </div>
                <div>
                  <Label htmlFor="reason" className="text-xs text-ink-2">Motif</Label>
                  <Select id="reason" name="reason" defaultValue="purchase">
                    {["purchase", "adjustment", "return", "damage", "initial"].map((r) => <option key={r} value={r}>{REASONS[r]}</option>)}
                  </Select>
                </div>
              </div>
              <Label htmlFor="note" className="mt-3 text-xs text-ink-2">Note (facultatif)</Label>
              <Input id="note" name="note" maxLength={300} placeholder="Bon de réception n°…" />
            </ActionForm>
            <ActionForm action={saveLowStockThreshold} submit="Enregistrer le seuil" variant="secondary" className="mt-5 border-t border-line pt-4">
              <input type="hidden" name="id" value={p.id} />
              <Label htmlFor="threshold" className="text-xs text-ink-2">Alerte stock bas à partir de</Label>
              <Input id="threshold" name="threshold" type="number" min={0} defaultValue={inventory?.low_stock_threshold ?? 5} />
            </ActionForm>
            {(movements ?? []).length > 0 ? (
              <details className="mt-4 border-t border-line pt-3 text-sm">
                <summary className="cursor-pointer font-medium">Derniers mouvements</summary>
                <ul className="mt-2 space-y-1.5">
                  {(movements ?? []).map((m) => (
                    <li key={m.id} className="flex justify-between gap-3">
                      <span className="text-ink-2">{dateTime(m.created_at)} · {REASONS[m.reason] ?? m.reason}{m.note ? ` · ${m.note}` : ""}</span>
                      <span className={m.delta > 0 ? "shrink-0 text-success" : "shrink-0 text-accent"}>{m.delta > 0 ? "+" : ""}{m.delta} → {m.quantity_after}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </Card>

          <Card title="Compatibilité imprimantes">
            <p className="mb-3 text-xs text-ink-2">Seuls les liens vérifiés sont visibles en boutique (fiche produit et « Trouver mon encre »).</p>
            {linkRows.length === 0 ? <p className="mb-3 text-sm text-ink-2">Aucune imprimante liée.</p> : (
              <ul className="mb-4 divide-y divide-line text-sm">
                {linkRows.map((l) => (
                  <li key={l.printer_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="flex items-center gap-1.5">
                      {l.verified ? <BadgeCheck className="size-4 text-success" aria-label="Vérifié" /> : null}
                      {l.printer.brand.name} {l.printer.model}
                      {!l.verified ? <Pill tone="warning">Non vérifié</Pill> : null}
                    </span>
                    <span className="flex gap-1">
                      <ActionForm action={setLinkVerified} submit={l.verified ? "Retirer la vérification" : "Vérifier"} variant="quiet" className="[&>div]:mt-0">
                        <input type="hidden" name="product_id" value={p.id} />
                        <input type="hidden" name="printer_id" value={l.printer_id} />
                        <input type="hidden" name="verified" value={String(!l.verified)} />
                      </ActionForm>
                      <ActionForm action={unlinkPrinter} submit="Supprimer" variant="quiet" className="[&>div]:mt-0" confirm="Supprimer ce lien de compatibilité ?">
                        <input type="hidden" name="product_id" value={p.id} />
                        <input type="hidden" name="printer_id" value={l.printer_id} />
                      </ActionForm>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {printerOptions.length === 0 ? (
              <p className="text-sm text-ink-2">Ajoutez d&apos;abord des imprimantes dans <Link href="/admin/printers" className="underline">Imprimantes</Link>.</p>
            ) : (
              <ActionForm action={linkPrinter} submit="Lier l'imprimante" variant="secondary" resetOnSuccess>
                <input type="hidden" name="product_id" value={p.id} />
                <Label htmlFor="printer" className="text-xs text-ink-2">Imprimante</Label>
                <Input id="printer" name="printer" list="printer-list" required placeholder="Tapez le modèle…" autoComplete="off" />
                <datalist id="printer-list">
                  {printerOptions.map((o) => <option key={o.slug} value={`${o.brand.name} ${o.model} (${o.slug})`} />)}
                </datalist>
                <label className="mt-2 flex items-center gap-2 text-sm"><Checkbox name="verified" defaultChecked /> Compatibilité vérifiée</label>
                <Input name="source" className="mt-2" maxLength={200} placeholder="Source (fiche constructeur, test…)" aria-label="Source" />
              </ActionForm>
            )}
          </Card>

          <Card title="Prix par quantité">
            {(tiers ?? []).length > 0 ? (
              <ul className="mb-4 divide-y divide-line text-sm">
                {(tiers ?? []).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                    <span>Dès {t.min_quantity} u : <strong>{da(t.price_dzd)}</strong> {t.business_only ? <Pill>Pros approuvés</Pill> : <Pill tone="success">Tous</Pill>}</span>
                    <ActionForm action={deletePriceTier} submit="Supprimer" variant="quiet" className="[&>div]:mt-0">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="tier" value={t.id} />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            ) : null}
            <ActionForm action={savePriceTier} submit="Ajouter le palier" variant="secondary" resetOnSuccess>
              <input type="hidden" name="id" value={p.id} />
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="min_quantity" className="text-xs text-ink-2">À partir de (u)</Label><Input id="min_quantity" name="min_quantity" type="number" min={2} required /></div>
                <div><Label htmlFor="tier_price" className="text-xs text-ink-2">Prix unitaire (DA)</Label><Input id="tier_price" name="price_dzd" type="number" min={0} step="0.01" required /></div>
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm"><Checkbox name="business_only" defaultChecked /> Réservé aux comptes professionnels approuvés</label>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
