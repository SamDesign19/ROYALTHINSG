import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Pagination, Pill, ORDER_STATUS, Table } from "@/components/admin/ui";
import { Input } from "@/components/ui/field";
import { da, dateTime } from "@/features/admin/format";
import { pick, type Localized } from "@/lib/localized";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";

export const metadata: Metadata = { title: "Commandes" };
const PAGE = 30;

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaff();
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status in ORDER_STATUS ? sp.status : null;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const db = await createSessionClient();
  let query = db
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, wilaya_code, delivery_method, total_dzd, status, payment_status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (status) query = query.eq("status", status);
  if (q) {
    const safe = q.replace(/[%,()*]/g, " ").trim();
    query = query.or(`order_number.ilike.*${safe}*,customer_name.ilike.*${safe}*,customer_phone.ilike.*${safe.replace(/\s/g, "")}*`);
  }
  const [{ data: orders, count, error }, { data: wilayas }] = await Promise.all([query, db.from("wilayas").select("code, name")]);
  if (error) throw new Error(error.message);
  const wilayaName = new Map((wilayas ?? []).map((w) => [w.code as number, pick(w.name as Localized, "fr")]));
  const href = (p: Partial<{ status: string | null; page: number }>) => {
    const u = new URLSearchParams();
    const st = p.status === undefined ? status : p.status;
    if (st) u.set("status", st);
    if (q) u.set("q", q);
    if (p.page && p.page > 1) u.set("page", String(p.page));
    return `/admin/orders${u.size ? `?${u}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Commandes" description="Paiement à la livraison. Confirmez chaque commande par téléphone avant l'expédition." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[null, ...Object.keys(ORDER_STATUS)].map((s) => (
          <Link
            key={s ?? "all"}
            href={href({ status: s, page: 1 })}
            className={cn("rounded-full border px-3 py-1.5 text-sm", s === status ? "border-ink bg-ink text-bg" : "border-line bg-bg hover:border-ink")}
          >
            {s ? ORDER_STATUS[s]!.label : "Toutes"}
          </Link>
        ))}
        <form className="ms-auto flex gap-2" action="/admin/orders">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <Input name="q" defaultValue={q} placeholder="N°, nom ou téléphone" className="min-h-10 w-64" aria-label="Rechercher une commande" />
        </form>
      </div>
      {(orders ?? []).length === 0 ? (
        <p className="rounded-card border border-dashed border-line bg-bg p-8 text-center text-ink-2">Aucune commande.</p>
      ) : (
        <Table>
          <thead>
            <tr><th>N°</th><th>Date</th><th>Client</th><th>Téléphone</th><th>Wilaya</th><th>Livraison</th><th className="text-end">Total</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-surface">
                <td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number}</Link></td>
                <td className="whitespace-nowrap text-ink-2">{dateTime(o.created_at)}</td>
                <td>{o.customer_name}</td>
                <td className="whitespace-nowrap tabular-nums"><a href={`tel:${o.customer_phone}`} className="hover:underline">{o.customer_phone}</a></td>
                <td>{String(o.wilaya_code).padStart(2, "0")} {wilayaName.get(o.wilaya_code)}</td>
                <td>{o.delivery_method === "home" ? "Domicile" : "Point relais"}</td>
                <td className="whitespace-nowrap text-end font-medium">{da(o.total_dzd)}</td>
                <td><Pill tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label}</Pill></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageCount={Math.ceil((count ?? 0) / PAGE)} href={(p) => href({ page: p })} />
    </>
  );
}
