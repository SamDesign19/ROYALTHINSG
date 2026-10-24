import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, Pill, ORDER_STATUS, Table } from "@/components/admin/ui";
import { algiersDay, da, dateTime } from "@/features/admin/format";
import { pick, type Localized } from "@/lib/localized";
import { createSessionClient } from "@/server/supabase";
import { requireStaff } from "@/server/auth";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function Dashboard() {
  await requireStaff();
  const db = await createSessionClient();
  const since = algiersDay(30);
  const [sales, pending, recent, alerts, best, drafts, active] = await Promise.all([
    db.from("admin_daily_sales").select("day, orders, cancelled, revenue_dzd").gte("day", since),
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("orders").select("id, order_number, customer_name, wilaya_code, total_dzd, status, created_at").order("created_at", { ascending: false }).limit(8),
    db.from("admin_stock_alerts").select("product_id, sku, name, quantity, alert").order("quantity").limit(10),
    db.from("admin_best_sellers").select("product_id, sku, name, units, revenue_dzd").order("units", { ascending: false }).limit(5),
    db.from("products").select("id", { count: "exact", head: true }).eq("status", "draft"),
    db.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  const rows = (sales.data ?? []) as { day: string; orders: number; cancelled: number; revenue_dzd: number | null }[];
  const revenue30 = rows.reduce((s, r) => s + Number(r.revenue_dzd ?? 0), 0);
  const orders30 = rows.reduce((s, r) => s + Number(r.orders), 0);
  const today = algiersDay();
  const todayRow = rows.find((r) => r.day === today);

  const kpis = [
    { label: "Commandes à traiter", value: String(pending.count ?? 0), href: "/admin/orders?status=pending", alert: (pending.count ?? 0) > 0 },
    { label: "Commandes aujourd'hui", value: String(todayRow?.orders ?? 0) },
    { label: "Chiffre d'affaires 30 j", value: da(revenue30), hint: `${orders30} commandes, hors annulées` },
    { label: "Produits en ligne", value: String(active.count ?? 0), hint: `${drafts.count ?? 0} brouillons à vérifier`, href: "/admin/products?status=draft" },
  ];

  return (
    <>
      <PageHeader title="Tableau de bord" description="Données réelles de la boutique (aucune donnée de démonstration)." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const body = (
            <div className="h-full rounded-card border border-line bg-bg p-5">
              <p className="text-sm text-ink-2">{k.label}</p>
              <p className={k.alert ? "mt-1 text-2xl font-semibold text-danger" : "mt-1 text-2xl font-semibold"}>{k.value}</p>
              {k.hint ? <p className="mt-1 text-xs text-ink-2">{k.hint}</p> : null}
            </div>
          );
          return k.href ? <Link key={k.label} href={k.href} className="block hover:opacity-80">{body}</Link> : <div key={k.label}>{body}</div>;
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Dernières commandes" actions={<Link href="/admin/orders" className="text-sm underline-offset-4 hover:underline">Toutes</Link>}>
          {(recent.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-2">Aucune commande pour le moment.</p>
          ) : (
            <Table>
              <thead><tr><th>N°</th><th>Client</th><th>Total</th><th>Statut</th><th>Date</th></tr></thead>
              <tbody>
                {(recent.data ?? []).map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number}</Link></td>
                    <td>{o.customer_name}</td>
                    <td className="whitespace-nowrap">{da(o.total_dzd)}</td>
                    <td><Pill tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label ?? o.status}</Pill></td>
                    <td className="whitespace-nowrap text-ink-2">{dateTime(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Alertes de stock" actions={<Link href="/admin/inventory" className="text-sm underline-offset-4 hover:underline">Stock</Link>}>
            {(alerts.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-2">Aucune alerte.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {(alerts.data ?? []).map((a) => (
                  <li key={a.product_id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/admin/products/${a.product_id}`} className="min-w-0 truncate hover:underline">
                      <span className="text-ink-2">{a.sku}</span> {pick(a.name as Localized, "fr")}
                    </Link>
                    <Pill tone={a.alert === "out_of_stock" ? "danger" : "warning"}>
                      {a.alert === "out_of_stock" ? <><AlertTriangle className="me-1 size-3" aria-hidden />Rupture</> : `${a.quantity} restant(s)`}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Meilleures ventes">
            {(best.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-2">Pas encore de ventes.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {(best.data ?? []).map((b) => (
                  <li key={b.sku} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">{pick(b.name as Localized, "fr")}</span>
                    <span className="shrink-0 text-ink-2">{b.units} u · {da(b.revenue_dzd)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
