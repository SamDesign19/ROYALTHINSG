import type { Metadata } from "next";
import Link from "next/link";
import { BulkForm } from "@/components/admin/bulk-form";
import { PageHeader, Pagination, Pill, PRODUCT_STATUS, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { da } from "@/features/admin/format";
import { bulkProducts } from "@/features/admin/products";
import { pick, type Localized } from "@/lib/localized";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";

export const metadata: Metadata = { title: "Produits" };
const PAGE = 50;

// Same normalisation as search_normalize() in the database (lower case, no accents).
const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireStaff();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const status = ["draft", "active", "archived"].includes(str("status")) ? str("status") : "";
  const category = str("category");
  const q = str("q").slice(0, 60);
  const price = str("price");
  const page = Math.max(1, Number(sp.page) || 1);

  const db = await createSessionClient();
  let query = db
    .from("products")
    .select("id, sku, name, model_code, price_dzd, status, is_featured, category:categories(slug, name), brand:brands(name), inventory(quantity)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category_id", category);
  if (q) query = query.ilike("search_text", `%${normalize(q).replace(/[%_]/g, " ")}%`);
  if (price === "missing") query = query.is("price_dzd", null);
  const [{ data, count, error }, { data: categories }] = await Promise.all([query, db.from("categories").select("id, name, parent_id").order("sort_order")]);
  if (error) throw new Error(error.message);
  type Row = { id: string; sku: string; name: Localized; model_code: string | null; price_dzd: number | null; status: string; is_featured: boolean; category: { name: Localized } | null; brand: { name: string } | null; inventory: { quantity: number } | null };
  const rows = (data ?? []) as unknown as Row[];
  const href = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, category, q, price })) if (v) u.set(k, v);
    if (p > 1) u.set("page", String(p));
    return `/admin/products${u.size ? `?${u}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Produits"
        description={`${count ?? 0} produit(s). Les brouillons ne sont pas visibles en boutique ; un produit en ligne doit avoir un prix.`}
        actions={<Button asChild size="sm"><Link href="/admin/products/new">Nouveau produit</Link></Button>}
      />
      <form className="mb-4 grid gap-2 rounded-card border border-line bg-bg p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1.5fr_1fr_auto]" action="/admin/products">
        <Input name="q" defaultValue={q} placeholder="Nom, référence, code, marque…" aria-label="Rechercher" className="min-h-10" />
        <Select name="status" defaultValue={status} aria-label="Statut" className="min-h-10">
          <option value="">Tous les statuts</option>
          {Object.entries(PRODUCT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select name="category" defaultValue={category} aria-label="Catégorie" className="min-h-10">
          <option value="">Toutes les catégories</option>
          {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.parent_id ? " " : ""}{pick(c.name as Localized, "fr")}</option>)}
        </Select>
        <Select name="price" defaultValue={price} aria-label="Prix" className="min-h-10">
          <option value="">Tous les prix</option>
          <option value="missing">Sans prix</option>
        </Select>
        <Button type="submit" variant="secondary" size="sm" className="min-h-10">Filtrer</Button>
      </form>

      <BulkForm
        action={bulkProducts}
        ops={[
          { op: "publish", label: "Mettre en ligne", primary: true },
          { op: "draft", label: "Repasser en brouillon" },
          { op: "feature", label: "À la une" },
          { op: "unfeature", label: "Retirer de la une" },
          { op: "archive", label: "Archiver" },
        ]}
      >
        <Table>
          <thead><tr><th className="w-8"><span className="sr-only">Sélection</span></th><th>Produit</th><th>Réf.</th><th>Catégorie</th><th className="text-end">Prix</th><th className="text-end">Stock</th><th>Statut</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-surface">
                <td><input type="checkbox" name="id" value={p.id} aria-label={`Sélectionner ${pick(p.name, "fr")}`} className="size-4 accent-ink" /></td>
                <td className="max-w-md">
                  <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{pick(p.name, "fr")}</Link>
                  <span className="block text-xs text-ink-2">{[p.brand?.name, p.model_code].filter(Boolean).join(" · ")}{p.is_featured ? " · ★ À la une" : ""}</span>
                </td>
                <td className="whitespace-nowrap text-ink-2">{p.sku}</td>
                <td className="text-ink-2">{pick(p.category?.name, "fr")}</td>
                <td className={p.price_dzd === null ? "text-end text-danger" : "whitespace-nowrap text-end"}>{p.price_dzd === null ? "Sans prix" : da(p.price_dzd)}</td>
                <td className="text-end tabular-nums">{p.inventory?.quantity ?? 0}</td>
                <td><Pill tone={PRODUCT_STATUS[p.status]?.tone}>{PRODUCT_STATUS[p.status]?.label}</Pill></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </BulkForm>
      <Pagination page={page} pageCount={Math.ceil((count ?? 0) / PAGE)} href={href} />
    </>
  );
}
