import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/forms";
import { Card, PageHeader, Pill, Table } from "@/components/admin/ui";
import { Input, Label, Select } from "@/components/ui/field";
import { da, dateOnly } from "@/features/admin/format";
import { savePromo, togglePromo } from "@/features/admin/settings";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";

export const metadata: Metadata = { title: "Codes promo" };

export default async function PromosPage() {
  await requireStaff();
  const db = await createSessionClient();
  const { data: promos } = await db.from("promo_codes").select("*").order("created_at", { ascending: false });
  return (
    <>
      <PageHeader title="Codes promo" description="Appliqués et vérifiés par la base de données au moment de la commande." />
      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <Card title="Nouveau code">
          <ActionForm action={savePromo} submit="Créer" resetOnSuccess>
            <div className="space-y-3">
              <div><Label htmlFor="code" className="text-xs text-ink-2">Code</Label><Input id="code" name="code" required placeholder="RENTREE10" className="uppercase" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="kind" className="text-xs text-ink-2">Type</Label>
                  <Select id="kind" name="kind" defaultValue="percent">
                    <option value="percent">Pourcentage</option>
                    <option value="fixed">Montant fixe (DA)</option>
                    <option value="free_shipping">Livraison gratuite</option>
                  </Select>
                </div>
                <div><Label htmlFor="value" className="text-xs text-ink-2">Valeur</Label><Input id="value" name="value" type="number" min={0} step="0.01" defaultValue={0} /></div>
              </div>
              <div><Label htmlFor="min" className="text-xs text-ink-2">Minimum de commande (DA)</Label><Input id="min" name="min_subtotal_dzd" type="number" min={0} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="max_uses" className="text-xs text-ink-2">Utilisations max</Label><Input id="max_uses" name="max_uses" type="number" min={1} /></div>
                <div><Label htmlFor="pcl" className="text-xs text-ink-2">Par client</Label><Input id="pcl" name="per_customer_limit" type="number" min={1} /></div>
              </div>
              <div><Label htmlFor="ends_at" className="text-xs text-ink-2">Fin de validité</Label><Input id="ends_at" name="ends_at" type="date" /></div>
            </div>
          </ActionForm>
        </Card>
        {(promos ?? []).length === 0 ? <p className="rounded-card border border-dashed border-line bg-bg p-8 text-center text-ink-2">Aucun code promo.</p> : (
          <Table>
            <thead><tr><th>Code</th><th>Remise</th><th>Minimum</th><th>Utilisations</th><th>Fin</th><th>Statut</th></tr></thead>
            <tbody>
              {(promos ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.code}</td>
                  <td>{p.kind === "percent" ? `${Number(p.value)} %` : p.kind === "fixed" ? da(p.value) : "Livraison gratuite"}</td>
                  <td>{Number(p.min_subtotal_dzd) > 0 ? da(p.min_subtotal_dzd) : "—"}</td>
                  <td className="tabular-nums">{p.used_count}{p.max_uses ? ` / ${p.max_uses}` : ""}</td>
                  <td className="text-ink-2">{p.ends_at ? dateOnly(p.ends_at) : "—"}</td>
                  <td>
                    <ActionForm action={togglePromo} submit={p.is_active ? "Désactiver" : "Activer"} variant="quiet" className="flex items-center gap-2 [&>div]:mt-0">
                      <Pill tone={p.is_active ? "success" : "neutral"}>{p.is_active ? "Actif" : "Inactif"}</Pill>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={String(!p.is_active)} />
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
