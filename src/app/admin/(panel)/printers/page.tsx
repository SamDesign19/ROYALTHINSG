import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/forms";
import { Card, PageHeader, Pill, Table } from "@/components/admin/ui";
import { Input, Label, Select } from "@/components/ui/field";
import { createPrinter, togglePrinterActive } from "@/features/admin/printers";
import { brandOptions } from "@/features/admin/queries";
import { PRINTER_KINDS } from "@/features/catalog/types";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";

export const metadata: Metadata = { title: "Imprimantes" };

const KIND_FR: Record<string, string> = {
  inkjet: "Jet d'encre", laser: "Laser", multifunction: "Multifonction", tank: "À réservoir",
  office: "Bureau", home: "Maison", large_format: "Grand format", other: "Autre",
};

export default async function PrintersPage({ searchParams }: PageProps<"/admin/printers">) {
  await requireStaff();
  const q = typeof (await searchParams).q === "string" ? ((await searchParams).q as string).trim().slice(0, 60) : "";
  const db = await createSessionClient();
  let query = db
    .from("printers")
    .select("id, model, slug, kind, is_active, brand:brands(name), series:printer_series(name), links:product_compatibility(verified)")
    .order("model")
    .limit(300);
  if (q) query = query.ilike("model", `%${q.replace(/[%_]/g, " ")}%`);
  const [{ data: printers }, brands, { data: series }] = await Promise.all([query, brandOptions(), db.from("printer_series").select("id, name, brand:brands(name)").order("name")]);
  type Row = { id: string; model: string; slug: string; kind: string; is_active: boolean; brand: { name: string }; series: { name: string } | null; links: { verified: boolean }[] };
  const rows = ((printers ?? []) as unknown as Row[]).sort((a, b) => `${a.brand.name}${a.model}`.localeCompare(`${b.brand.name}${b.model}`));

  return (
    <>
      <PageHeader title="Imprimantes et compatibilité" description="Les modèles alimentent « Trouver mon encre ». Liez les consommables depuis la fiche de chaque produit." />
      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <Card title="Ajouter un modèle">
          <ActionForm action={createPrinter} submit="Ajouter" resetOnSuccess>
            <div className="space-y-3">
              <div>
                <Label htmlFor="brand_id" className="text-xs text-ink-2">Marque</Label>
                <Select id="brand_id" name="brand_id" required defaultValue="">
                  <option value="" disabled>Choisir…</option>
                  {brands.filter((b) => b.name !== "ROYAL INK" && b.name !== "Lexprint").map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="series_id" className="text-xs text-ink-2">Série (facultatif)</Label>
                <Select id="series_id" name="series_id" defaultValue="">
                  <option value="">— Aucune / nouvelle —</option>
                  {((series ?? []) as unknown as { id: string; name: string; brand: { name: string } }[]).map((s) => <option key={s.id} value={s.id}>{s.brand.name} · {s.name}</option>)}
                </Select>
                <Input name="new_series" className="mt-2" placeholder="ou nouvelle série : i-SENSYS MF440, EcoTank…" aria-label="Nouvelle série" />
              </div>
              <div>
                <Label htmlFor="model" className="text-xs text-ink-2">Modèle</Label>
                <Input id="model" name="model" required placeholder="i-SENSYS MF443dw" />
              </div>
              <div>
                <Label htmlFor="kind" className="text-xs text-ink-2">Type</Label>
                <Select id="kind" name="kind" defaultValue="laser">
                  {PRINTER_KINDS.map((k) => <option key={k} value={k}>{KIND_FR[k]}</option>)}
                </Select>
              </div>
            </div>
          </ActionForm>
        </Card>

        <div>
          <form action="/admin/printers" className="mb-3">
            <Input name="q" defaultValue={q} placeholder="Rechercher un modèle" aria-label="Rechercher un modèle" className="min-h-10 max-w-sm" />
          </form>
          {rows.length === 0 ? <p className="rounded-card border border-dashed border-line bg-bg p-8 text-center text-ink-2">Aucune imprimante.</p> : (
            <Table>
              <thead><tr><th>Marque</th><th>Série</th><th>Modèle</th><th>Type</th><th>Consommables liés</th><th>Statut</th></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const verified = p.links.filter((l) => l.verified).length;
                  return (
                    <tr key={p.id}>
                      <td>{p.brand.name}</td>
                      <td className="text-ink-2">{p.series?.name ?? "—"}</td>
                      <td className="font-medium">{p.model}</td>
                      <td className="text-ink-2">{KIND_FR[p.kind]}</td>
                      <td>{verified} vérifié(s){p.links.length > verified ? <span className="text-ink-2"> · {p.links.length - verified} à vérifier</span> : null}</td>
                      <td>
                        <ActionForm action={togglePrinterActive} submit={p.is_active ? "Masquer" : "Afficher"} variant="quiet" className="flex items-center gap-2 [&>div]:mt-0">
                          <Pill tone={p.is_active ? "success" : "neutral"}>{p.is_active ? "Visible" : "Masquée"}</Pill>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="active" value={String(!p.is_active)} />
                        </ActionForm>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
