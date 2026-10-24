"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select } from "@/components/ui/field";
import { INK_COLORS, ORIGINS, PRODUCT_TYPES } from "@/features/catalog/types";
import type { SearchFilters } from "@/features/search/params";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type FacetOptions = {
  brands: { slug: string; name: string }[];
  categories: { slug: string; name: string; depth: number }[];
};

/** Fixed scope of the page (the category of /c/[category], …), sent to the count endpoint only. */
export type ListingScope = { category?: string; brand?: string; printer?: string };

type MultiFacet = "brand" | "type" | "color";

/** Builds the listing URL from the form, dropping empty values and resetting to page 1. */
function queryFromForm(form: HTMLFormElement): URLSearchParams {
  const p = new URLSearchParams();
  for (const [key, value] of new FormData(form)) {
    if (typeof value === "string" && value.trim() !== "") p.append(key, value.trim());
  }
  return p;
}

export function FilterPanel({
  filters,
  facets,
  pathname,
  scope,
  hide = [],
  mode,
  onApplied,
}: {
  filters: SearchFilters;
  facets: FacetOptions;
  pathname: string;
  scope: ListingScope;
  hide?: ("brand" | "category")[];
  mode: "rail" | "sheet";
  onApplied?: () => void;
}) {
  const t = useTranslations("filters");
  const tTypes = useTranslations("types");
  const tColors = useTranslations("colors");
  const tOrigins = useTranslations("origins");
  const router = useRouter();
  const locale = useLocale();
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [count, setCount] = useState<number | null>(null);

  function apply() {
    if (!form.current) return;
    const q = queryFromForm(form.current).toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
    onApplied?.();
  }

  // In the mobile sheet, show the live result count on the "Show N results" button.
  function refreshCount() {
    if (mode !== "sheet" || !form.current) return;
    const q = queryFromForm(form.current);
    for (const [k, v] of Object.entries(scope)) if (v) q.set(k, v);
    fetch(`/api/search/count?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { total: number } | null) => setCount(d?.total ?? null))
      .catch(() => setCount(null));
  }
  // The inputs are uncontrolled: when the URL changes (a removed chip, the back button), reset
  // them to the new defaults rendered from the server.
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    form.current?.reset();
    refreshCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const checked = (name: MultiFacet, value: string) =>
    (name === "brand" ? filters.brands : name === "type" ? filters.types : filters.colors).includes(value as never);

  return (
    <form
      ref={form}
      action={`/${locale}${pathname}`}
      method="get"
      onChange={(e) => {
        if (e.target instanceof HTMLInputElement && e.target.type === "number") return; // applied with the button or Enter
        if (mode === "rail") apply();
        else refreshCount();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className={cn("flex flex-col", mode === "sheet" && "min-h-full")}
    >
      {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
      {filters.sort !== (filters.q ? "relevance" : "popular") ? <input type="hidden" name="sort" value={filters.sort} /> : null}
      {filters.printer && !scope.printer ? <input type="hidden" name="printer" value={filters.printer} /> : null}

      <div className={cn("divide-y divide-line", mode === "sheet" && "px-4")}>
        {!hide.includes("category") && facets.categories.length > 0 ? (
          <Group title={t("category")}>
            <Label htmlFor={`${id}-category`} className="sr-only">{t("category")}</Label>
            <Select id={`${id}-category`} name="category" defaultValue={filters.category ?? ""}>
              <option value="">{t("any")}</option>
              {facets.categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {" ".repeat(c.depth)}
                  {c.name}
                </option>
              ))}
            </Select>
          </Group>
        ) : null}

        {!hide.includes("brand") && facets.brands.length > 0 ? (
          <Group title={t("brand")}>
            <CheckList name="brand" options={facets.brands.map((b) => ({ value: b.slug, label: b.name }))} isChecked={(v) => checked("brand", v)} />
          </Group>
        ) : null}

        <Group title={t("origin")}>
          <div className="flex flex-col gap-1">
            {[{ value: "", label: t("any") }, ...ORIGINS.map((o) => ({ value: o, label: tOrigins(o) }))].map((o) => (
              <label key={o.value || "any"} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
                <input type="radio" name="origin" value={o.value} defaultChecked={(filters.origin ?? "") === o.value} className="size-4 accent-ink" />
                {o.label}
              </label>
            ))}
          </div>
        </Group>

        <Group title={t("type")}>
          <CheckList name="type" options={PRODUCT_TYPES.map((v) => ({ value: v, label: tTypes(v) }))} isChecked={(v) => checked("type", v)} />
        </Group>

        <Group title={t("color")}>
          <CheckList
            name="color"
            options={INK_COLORS.filter((c) => c !== "none").map((v) => ({ value: v, label: tColors(v) }))}
            isChecked={(v) => checked("color", v)}
            collapsedAfter={6}
          />
        </Group>

        <Group title={t("price")}>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor={`${id}-min`} className="text-xs font-normal text-ink-2">{t("min")}</Label>
              <Input id={`${id}-min`} name="min" type="number" inputMode="numeric" min={0} step={100} defaultValue={filters.minPrice ?? ""} dir="ltr" />
            </div>
            <div className="flex-1">
              <Label htmlFor={`${id}-max`} className="text-xs font-normal text-ink-2">{t("max")}</Label>
              <Input id={`${id}-max`} name="max" type="number" inputMode="numeric" min={0} step={100} defaultValue={filters.maxPrice ?? ""} dir="ltr" />
            </div>
            {mode === "rail" ? (
              <Button type="submit" variant="secondary" size="sm" className="min-h-11">{t("apply")}</Button>
            ) : null}
          </div>
        </Group>

        <Group title={t("availability")}>
          <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox name="stock" value="1" defaultChecked={filters.inStock} />
            {t("inStock")}
          </label>
        </Group>
      </div>

      {mode === "sheet" ? (
        <div className="sticky bottom-0 mt-auto flex gap-2 border-t border-line bg-bg p-4">
          <Button type="button" variant="secondary" onClick={() => { router.push(filters.q ? `${pathname}?q=${encodeURIComponent(filters.q)}` : pathname); onApplied?.(); }}>
            {t("reset")}
          </Button>
          <Button type="submit" className="flex-1">
            {count === null ? t("apply") : t("show", { count })}
          </Button>
        </div>
      ) : (
        <noscript>
          <Button type="submit" className="mt-4 w-full">{t("apply")}</Button>
        </noscript>
      )}
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="py-4 first:pt-0">
      <legend className="mb-2 float-start w-full text-sm font-semibold">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function CheckList({
  name,
  options,
  isChecked,
  collapsedAfter = 8,
}: {
  name: string;
  options: { value: string; label: string }[];
  isChecked: (value: string) => boolean;
  collapsedAfter?: number;
}) {
  const t = useTranslations("common");
  const anyHiddenChecked = options.slice(collapsedAfter).some((o) => isChecked(o.value));
  const [expanded, setExpanded] = useState(anyHiddenChecked);
  const visible = expanded ? options : options.slice(0, collapsedAfter);
  return (
    <div className="flex flex-col gap-0.5">
      {visible.map((o) => (
        <label key={o.value} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox name={name} value={o.value} defaultChecked={isChecked(o.value)} />
          {o.label}
        </label>
      ))}
      {/* Keep collapsed checked values in the form. */}
      {!expanded
        ? options.slice(collapsedAfter).filter((o) => isChecked(o.value)).map((o) => <input key={o.value} type="hidden" name={name} value={o.value} />)
        : null}
      {options.length > collapsedAfter ? (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1 self-start text-sm font-medium underline-offset-4 hover:underline">
          {expanded ? "−" : `+ ${options.length - collapsedAfter}`} <span className="sr-only">{t("viewAll")}</span>
        </button>
      ) : null}
    </div>
  );
}
