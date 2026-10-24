import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, Pill, Table } from "@/components/admin/ui";
import { dateTime } from "@/features/admin/format";
import { pick, type Localized } from "@/lib/localized";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";

export const metadata: Metadata = { title: "Stock" };

const REASONS: Record<string, string> = {
  initial: "Stock initial", purchase: "Réception", sale: "Vente", adjustment: "Ajustement",
  return: "Retour", cancellation: "Annulation", damage: "Casse / perte",
};

export default async function InventoryPage() {
  await requireStaff();
  const db = await createSessionClient();
  const [{ data: alerts }, { data: moves }] = await Promise.all([
    db.from("admin_stock_alerts").select("product_id, sku, name, status, quantity, low_stock_threshold, alert").order("quantity").limit(200),
    db.from("inventory_movements").select("id, delta, quantity_after, reason, note, created_at, product:products(id, sku, name)").order("created_at", { ascending: false }).limit(50),
  ]);
  type Move = { id: number; delta: number; quantity_after: number; reason: string; note: string | null; created_at: string; product: { id: string; sku: string; name: Localized } | null };
  return (
    <>
      <PageHeader title="Stock" description="Les entrées et sorties se saisissent sur la fiche de chaque produit ; les ventes et annulations sont enregistrées automatiquement." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={`Alertes (${(alerts ?? []).length})`}>
          {(alerts ?? []).length === 0 ? <p className="text-sm text-ink-2">Aucun produit en rupture ou sous son seuil.</p> : (
            <Table>
              <thead><tr><th>Produit</th><th className="text-end">Stock</th><th className="text-end">Seuil</th><th>État</th></tr></thead>
              <tbody>
                {(alerts ?? []).map((a) => (
                  <tr key={a.product_id}>
                    <td><Link href={`/admin/products/${a.product_id}`} className="hover:underline"><span className="text-ink-2">{a.sku}</span> {pick(a.name as Localized, "fr")}</Link>{a.status === "draft" ? <span className="ms-1 text-xs text-ink-2">(brouillon)</span> : null}</td>
                    <td className="text-end tabular-nums">{a.quantity}</td>
                    <td className="text-end tabular-nums text-ink-2">{a.low_stock_threshold}</td>
                    <td><Pill tone={a.alert === "out_of_stock" ? "danger" : "warning"}>{a.alert === "out_of_stock" ? "Rupture" : "Stock bas"}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title="Derniers mouvements">
          {(moves ?? []).length === 0 ? <p className="text-sm text-ink-2">Aucun mouvement.</p> : (
            <Table>
              <thead><tr><th>Date</th><th>Produit</th><th>Motif</th><th className="text-end">Mvt</th><th className="text-end">Après</th></tr></thead>
              <tbody>
                {((moves ?? []) as unknown as Move[]).map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap text-ink-2">{dateTime(m.created_at)}</td>
                    <td>{m.product ? <Link href={`/admin/products/${m.product.id}`} className="hover:underline">{pick(m.product.name, "fr")}</Link> : "—"}</td>
                    <td className="text-ink-2">{REASONS[m.reason] ?? m.reason}{m.note ? ` · ${m.note}` : ""}</td>
                    <td className={m.delta > 0 ? "text-end text-success" : "text-end text-danger"}>{m.delta > 0 ? "+" : ""}{m.delta}</td>
                    <td className="text-end tabular-nums">{m.quantity_after}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
