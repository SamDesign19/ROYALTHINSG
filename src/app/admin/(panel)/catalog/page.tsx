import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/forms";
import { Card, PageHeader } from "@/components/admin/ui";
import { Checkbox, Input } from "@/components/ui/field";
import { saveBrand, saveCategory } from "@/features/admin/settings";
import type { Localized } from "@/lib/localized";
import { requireStaff } from "@/server/auth";
import { createSessionClient } from "@/server/supabase";

export const metadata: Metadata = { title: "Catégories et marques" };

export default async function CatalogPage() {
  await requireStaff();
  const db = await createSessionClient();
  const [{ data: categories }, { data: brands }] = await Promise.all([
    db.from("categories").select("id, parent_id, slug, name, sort_order, is_active").order("sort_order"),
    db.from("brands").select("id, name, slug, makes_printers, is_active").order("name"),
  ]);
  type Cat = { id: string; parent_id: string | null; slug: string; name: Localized; sort_order: number; is_active: boolean };
  const cats = (categories ?? []) as Cat[];
  const ordered: (Cat & { depth: number })[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of cats.filter((x) => x.parent_id === parent)) {
      ordered.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);

  return (
    <>
      <PageHeader title="Catégories et marques" />
      <div className="grid gap-6 2xl:grid-cols-[1.4fr_1fr]">
        <Card title="Catégories">
          <p className="mb-3 text-xs text-ink-2">Noms affichés en boutique dans les trois langues. Une catégorie masquée disparaît du menu et de la boutique.</p>
          <ul className="divide-y divide-line">
            {ordered.map((c) => (
              <li key={c.id} className="py-2" style={{ paddingInlineStart: `${c.depth * 1.5}rem` }}>
                <ActionForm action={saveCategory} submit="OK" variant="secondary" className="flex flex-wrap items-end gap-2 [&>div]:mt-0">
                  <input type="hidden" name="id" value={c.id} />
                  <Input name="fr" defaultValue={c.name.fr ?? ""} aria-label="Nom français" className="min-h-9 w-44" />
                  <Input name="ar" dir="rtl" defaultValue={c.name.ar ?? ""} aria-label="Nom arabe" className="min-h-9 w-40" />
                  <Input name="en" defaultValue={c.name.en ?? ""} aria-label="Nom anglais" className="min-h-9 w-40" />
                  <Input name="sort_order" type="number" min={0} defaultValue={c.sort_order} aria-label="Ordre" className="min-h-9 w-16" />
                  <label className="flex min-h-9 items-center gap-1.5 text-xs"><Checkbox name="is_active" defaultChecked={c.is_active} /> Visible</label>
                </ActionForm>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Marques">
          <ActionForm action={saveBrand} submit="Ajouter la marque" variant="secondary" className="mb-4 border-b border-line pb-4" resetOnSuccess>
            <Input name="name" required placeholder="Nouvelle marque" aria-label="Nouvelle marque" />
            <label className="mt-2 flex items-center gap-2 text-sm"><Checkbox name="makes_printers" /> Fabrique des imprimantes (« Trouver mon encre »)</label>
          </ActionForm>
          <ul className="divide-y divide-line">
            {(brands ?? []).map((b) => (
              <li key={b.id} className="py-2">
                <ActionForm action={saveBrand} submit="OK" variant="secondary" className="flex flex-wrap items-end gap-2 [&>div]:mt-0">
                  <input type="hidden" name="id" value={b.id} />
                  <Input name="name" defaultValue={b.name} aria-label="Nom" className="min-h-9 w-40" />
                  <label className="flex min-h-9 items-center gap-1.5 text-xs"><Checkbox name="makes_printers" defaultChecked={b.makes_printers} /> Imprimantes</label>
                  <label className="flex min-h-9 items-center gap-1.5 text-xs"><Checkbox name="is_active" defaultChecked={b.is_active} /> Visible</label>
                </ActionForm>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
