"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select } from "@/components/ui/field";
import { INK_COLORS, ORIGINS, PRODUCT_TYPES, YIELD_TYPES } from "@/features/catalog/types";
import { saveProduct, type SaveResult } from "@/features/admin/products";
import type { Localized } from "@/lib/localized";
import { Notice } from "./ui";

const TYPE_FR: Record<string, string> = {
  ink_bottle: "Bouteille d'encre", ink_cartridge: "Cartouche d'encre", toner: "Toner", printer: "Imprimante", drum: "Tambour",
  maintenance_box: "Boîte de maintenance", printer_part: "Pièce d'imprimante", paper: "Papier", label: "Étiquettes", cleaning: "Nettoyage", other: "Autre",
};
const COLOR_FR: Record<string, string> = {
  black: "Noir", cyan: "Cyan", magenta: "Magenta", yellow: "Jaune", photo_black: "Noir photo", matte_black: "Noir mat", grey: "Gris",
  light_cyan: "Cyan clair", light_magenta: "Magenta clair", red: "Rouge", blue: "Bleu", green: "Vert", white: "Blanc",
  tri_color: "Trois couleurs", multi: "Multipack", none: "Aucune",
};
const YIELD_FR: Record<string, string> = { standard: "Standard", high: "Haute capacité", extra_high: "Très haute capacité" };

export type ProductFormValues = {
  id?: string; sku: string; slug: string; name: Localized; short_description: Localized | null; description: Localized | null;
  product_type: string; category_id: string; brand_id: string | null; model_code: string | null; oem_reference: string | null;
  origin: string | null; color: string | null; yield_type: string | null; page_yield: number | null; volume_ml: number | null;
  pack_size: number; price_dzd: number | null; compare_at_dzd: number | null; weight_grams: number | null; status: string;
  is_featured: boolean; specs: Record<string, unknown>;
};

const slugify = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);

export function ProductForm({
  product,
  categories,
  brands,
}: {
  product: ProductFormValues | null;
  categories: { id: string; name: string; depth: number }[];
  brands: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SaveResult, FormData>(saveProduct, null);
  const [, start] = useTransition();
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const p = product;

  useEffect(() => {
    if (state?.ok && state.id && !p?.id) router.replace(`/admin/products/${state.id}`);
  }, [state, p?.id, router]);

  const specsText = Object.entries(p?.specs ?? {})
    .filter(([k]) => !k.startsWith("import_"))
    .map(([k, v]) => `${k}: ${typeof v === "object" && v ? Object.values(v as Record<string, string>)[0] : String(v)}`)
    .join("\n");

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(() => action(data)); // keeps the typed values if the save fails
      }}
    >
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <Section title="Nom et description">
        <div className="grid gap-4 md:grid-cols-3">
          <F label="Nom (français)" htmlFor="name_fr">
            <Input id="name_fr" name="name_fr" defaultValue={p?.name.fr ?? ""} onChange={(e) => !slugEdited && setSlug(slugify(e.target.value))} />
          </F>
          <F label="Nom (arabe)" htmlFor="name_ar"><Input id="name_ar" name="name_ar" dir="rtl" defaultValue={p?.name.ar ?? ""} /></F>
          <F label="Nom (anglais)" htmlFor="name_en"><Input id="name_en" name="name_en" defaultValue={p?.name.en ?? ""} /></F>
          <F label="Résumé (français)" htmlFor="short_fr"><Input id="short_fr" name="short_fr" defaultValue={p?.short_description?.fr ?? ""} /></F>
          <F label="Résumé (arabe)" htmlFor="short_ar"><Input id="short_ar" name="short_ar" dir="rtl" defaultValue={p?.short_description?.ar ?? ""} /></F>
          <F label="Résumé (anglais)" htmlFor="short_en"><Input id="short_en" name="short_en" defaultValue={p?.short_description?.en ?? ""} /></F>
          {(["fr", "ar", "en"] as const).map((l) => (
            <F key={l} label={`Description (${{ fr: "français", ar: "arabe", en: "anglais" }[l]})`} htmlFor={`desc_${l}`}>
              <textarea id={`desc_${l}`} name={`desc_${l}`} rows={4} dir={l === "ar" ? "rtl" : undefined} defaultValue={p?.description?.[l] ?? ""} className="w-full rounded-control border border-line bg-bg p-3 text-sm focus-visible:border-ink focus-visible:outline-none" />
            </F>
          ))}
        </div>
      </Section>

      <Section title="Prix et publication">
        <div className="grid gap-4 md:grid-cols-4">
          <F label="Prix de vente (DA)" htmlFor="price_dzd"><Input id="price_dzd" name="price_dzd" type="number" min={0} step="0.01" defaultValue={p?.price_dzd ?? ""} /></F>
          <F label="Prix barré (DA, facultatif)" htmlFor="compare_at_dzd"><Input id="compare_at_dzd" name="compare_at_dzd" type="number" min={0} step="0.01" defaultValue={p?.compare_at_dzd ?? ""} /></F>
          <F label="Statut" htmlFor="status">
            <Select id="status" name="status" defaultValue={p?.status ?? "draft"}>
              <option value="draft">Brouillon (invisible)</option>
              <option value="active">En ligne</option>
              <option value="archived">Archivé</option>
            </Select>
          </F>
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <Checkbox name="is_featured" defaultChecked={p?.is_featured} /> À la une (page d&apos;accueil)
          </label>
        </div>
      </Section>

      <Section title="Classement et caractéristiques">
        <div className="grid gap-4 md:grid-cols-3">
          <F label="Référence interne (SKU)" htmlFor="sku"><Input id="sku" name="sku" required defaultValue={p?.sku ?? ""} /></F>
          <F label="Adresse web (slug)" htmlFor="slug">
            <Input id="slug" name="slug" required value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          </F>
          <F label="Type" htmlFor="product_type">
            <Select id="product_type" name="product_type" defaultValue={p?.product_type ?? "toner"}>
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{TYPE_FR[t]}</option>)}
            </Select>
          </F>
          <F label="Catégorie" htmlFor="category_id">
            <Select id="category_id" name="category_id" required defaultValue={p?.category_id ?? ""}>
              <option value="" disabled>Choisir…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{" ".repeat(c.depth)}{c.name}</option>)}
            </Select>
          </F>
          <F label="Marque" htmlFor="brand_id">
            <Select id="brand_id" name="brand_id" defaultValue={p?.brand_id ?? ""}>
              <option value="">—</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </F>
          <F label="Origine" htmlFor="origin">
            <Select id="origin" name="origin" defaultValue={p?.origin ?? ""}>
              <option value="">— (non consommable)</option>
              {ORIGINS.map((o) => <option key={o} value={o}>{o === "original" ? "Original (constructeur)" : "Compatible"}</option>)}
            </Select>
          </F>
          <F label="Code cartouche / toner" htmlFor="model_code"><Input id="model_code" name="model_code" defaultValue={p?.model_code ?? ""} placeholder="057H, TN-2420…" /></F>
          <F label="Référence constructeur" htmlFor="oem_reference"><Input id="oem_reference" name="oem_reference" defaultValue={p?.oem_reference ?? ""} placeholder="3010C002" /></F>
          <F label="Couleur" htmlFor="color">
            <Select id="color" name="color" defaultValue={p?.color ?? ""}>
              <option value="">—</option>
              {INK_COLORS.map((c) => <option key={c} value={c}>{COLOR_FR[c]}</option>)}
            </Select>
          </F>
          <F label="Capacité" htmlFor="yield_type">
            <Select id="yield_type" name="yield_type" defaultValue={p?.yield_type ?? ""}>
              <option value="">—</option>
              {YIELD_TYPES.map((y) => <option key={y} value={y}>{YIELD_FR[y]}</option>)}
            </Select>
          </F>
          <F label="Rendement (pages)" htmlFor="page_yield"><Input id="page_yield" name="page_yield" type="number" min={1} defaultValue={p?.page_yield ?? ""} /></F>
          <F label="Volume (ml)" htmlFor="volume_ml"><Input id="volume_ml" name="volume_ml" type="number" min={0} step="0.01" defaultValue={p?.volume_ml ?? ""} /></F>
          <F label="Conditionnement (unités)" htmlFor="pack_size"><Input id="pack_size" name="pack_size" type="number" min={1} defaultValue={p?.pack_size ?? 1} /></F>
          <F label="Poids (g)" htmlFor="weight_grams"><Input id="weight_grams" name="weight_grams" type="number" min={1} defaultValue={p?.weight_grams ?? ""} /></F>
        </div>
        <F label="Spécifications (une par ligne : « Clé: valeur »)" htmlFor="specs">
          <textarea id="specs" name="specs" rows={4} defaultValue={specsText} placeholder={"Interface: USB, Wi-Fi\nFormat: A4"} className="w-full rounded-control border border-line bg-bg p-3 text-sm focus-visible:border-ink focus-visible:outline-none" />
        </F>
      </Section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-card border border-line bg-bg p-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {p ? "Enregistrer" : "Créer le produit"}
        </Button>
        {state?.error ? <Notice tone="danger">{state.error}</Notice> : state?.ok ? <Notice>{state.ok}</Notice> : null}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-card border border-line bg-bg p-5">
      <legend className="float-start mb-2 w-full text-base font-semibold">{title}</legend>
      <div className="clear-both space-y-4">{children}</div>
    </fieldset>
  );
}

function F({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-ink-2">{label}</Label>
      {children}
    </div>
  );
}
