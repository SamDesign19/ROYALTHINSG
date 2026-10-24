import type { Metadata } from "next";
import { FillColumn } from "@/components/admin/fill-column";
import { ActionForm } from "@/components/admin/forms";
import { Card, PageHeader, Pill, Table } from "@/components/admin/ui";
import { Input, Label, Select } from "@/components/ui/field";
import { savePickupPoint, saveDeliveryRates } from "@/features/admin/settings";
import { pick, type Localized } from "@/lib/localized";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";

export const metadata: Metadata = { title: "Livraison" };

export default async function DeliveryPage() {
  await requireStaff();
  const db = await createSessionClient();
  const [{ data: wilayas }, { data: rates }, { data: points }] = await Promise.all([
    db.from("wilayas").select("code, name").order("code"),
    db.from("delivery_rates").select("wilaya_code, method, fee_dzd, free_over_dzd, eta_min_days, eta_max_days"),
    db.from("pickup_points").select("id, wilaya_code, name, address, phone, opening_hours, is_active").order("wilaya_code"),
  ]);
  const rate = (code: number, method: string) => (rates ?? []).find((r) => r.wilaya_code === code && r.method === method);
  const open = new Set((rates ?? []).map((r) => r.wilaya_code)).size;
  const ws = (wilayas ?? []) as { code: number; name: Localized }[];

  return (
    <>
      <PageHeader
        title="Livraison"
        description={<>{open === 0 ? <Pill tone="danger">Commande en ligne fermée</Pill> : <Pill tone="success">{open} wilaya(s) ouvertes</Pill>} Une wilaya sans tarif ne peut pas être choisie au paiement. Laissez un frais vide pour fermer ce mode.</>}
      />
      <div className="grid gap-6 2xl:grid-cols-[1.6fr_1fr]">
        <Card title="Tarifs par wilaya">
          <ActionForm action={saveDeliveryRates} submit="Enregistrer les tarifs">
            <div className="mb-3 flex flex-wrap gap-3">
              <FillColumn prefix="home_" label="Domicile DA" />
              <FillColumn prefix="pickup_" label="Point relais DA" />
              <FillColumn prefix="min_" label="Délai min (j)" />
              <FillColumn prefix="max_" label="Délai max (j)" />
            </div>
            <Table className="max-h-[70vh]">
              <thead className="sticky top-0"><tr><th>Wilaya</th><th>Domicile (DA)</th><th>Point relais (DA)</th><th>Gratuit dès (DA)</th><th>Délai (jours)</th></tr></thead>
              <tbody>
                {ws.map((w) => {
                  const home = rate(w.code, "home"), pickup = rate(w.code, "pickup");
                  const any = home ?? pickup;
                  return (
                    <tr key={w.code}>
                      <td className="whitespace-nowrap"><input type="hidden" name="code" value={w.code} />{String(w.code).padStart(2, "0")} {pick(w.name, "fr")}</td>
                      <td><Input name={`home_${w.code}`} type="number" min={0} defaultValue={home?.fee_dzd ?? ""} aria-label={`Domicile ${pick(w.name, "fr")}`} className="min-h-9 w-24" /></td>
                      <td><Input name={`pickup_${w.code}`} type="number" min={0} defaultValue={pickup?.fee_dzd ?? ""} aria-label={`Point relais ${pick(w.name, "fr")}`} className="min-h-9 w-24" /></td>
                      <td><Input name={`free_${w.code}`} type="number" min={0} defaultValue={any?.free_over_dzd ?? ""} aria-label={`Gratuit dès ${pick(w.name, "fr")}`} className="min-h-9 w-28" /></td>
                      <td className="whitespace-nowrap">
                        <Input name={`min_${w.code}`} type="number" min={0} defaultValue={any?.eta_min_days ?? ""} aria-label="Délai min" className="inline-block min-h-9 w-16" />
                        {" – "}
                        <Input name={`max_${w.code}`} type="number" min={0} defaultValue={any?.eta_max_days ?? ""} aria-label="Délai max" className="inline-block min-h-9 w-16" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </ActionForm>
        </Card>

        <Card title="Points relais">
          {(points ?? []).length > 0 ? (
            <ul className="mb-4 divide-y divide-line text-sm">
              {(points ?? []).map((p) => (
                <li key={p.id} className="py-2">
                  <p className="font-medium">{String(p.wilaya_code).padStart(2, "0")} · {p.name} {p.is_active ? null : <Pill>Masqué</Pill>}</p>
                  <p className="text-ink-2">{p.address}{p.phone ? ` · ${p.phone}` : ""}{p.opening_hours ? ` · ${p.opening_hours}` : ""}</p>
                </li>
              ))}
            </ul>
          ) : <p className="mb-4 text-sm text-ink-2">Aucun point relais.</p>}
          <ActionForm action={savePickupPoint} submit="Ajouter le point relais" variant="secondary" resetOnSuccess>
            <div className="space-y-2">
              <div>
                <Label htmlFor="pp_w" className="text-xs text-ink-2">Wilaya</Label>
                <Select id="pp_w" name="wilaya_code" required defaultValue="">
                  <option value="" disabled>Choisir…</option>
                  {ws.map((w) => <option key={w.code} value={w.code}>{String(w.code).padStart(2, "0")} {pick(w.name, "fr")}</option>)}
                </Select>
              </div>
              <Input name="name" required placeholder="Nom (ex. Siège El Eulma)" aria-label="Nom" />
              <Input name="address" required placeholder="Adresse" aria-label="Adresse" />
              <Input name="phone" placeholder="Téléphone (facultatif)" aria-label="Téléphone" />
              <Input name="opening_hours" placeholder="Horaires (facultatif)" aria-label="Horaires" />
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
