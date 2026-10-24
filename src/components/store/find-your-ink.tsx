"use client";

import { ArrowRight, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Catalog = {
  series: { id: string; name: string }[];
  printers: { id: string; slug: string; model: string; series_id: string | null }[];
};

/** Brand -> series -> model selector. Only printers with published models are listed. */
export function FindYourInk({ brands, className }: { brands: { slug: string; name: string }[]; className?: string }) {
  const t = useTranslations("findInk");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [brand, setBrand] = useState(brands.length === 1 ? brands[0]!.slug : "");
  const [series, setSeries] = useState("");
  const [printer, setPrinter] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">(brand ? "loading" : "idle");

  function chooseBrand(slug: string) {
    setBrand(slug);
    setSeries("");
    setPrinter("");
    setCatalog(null);
    setState(slug ? "loading" : "idle");
  }

  useEffect(() => {
    if (!brand) return;
    const ctrl = new AbortController();
    fetch(`/api/printers?brand=${encodeURIComponent(brand)}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Catalog>;
      })
      .then((d) => {
        setCatalog(d);
        setState("idle");
      })
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) setState("error");
      });
    return () => ctrl.abort();
  }, [brand]);

  const models = useMemo(
    () => (catalog?.printers ?? []).filter((p) => !series || p.series_id === series),
    [catalog, series],
  );
  // Series that actually contain models.
  const usedSeries = useMemo(
    () => (catalog?.series ?? []).filter((s) => catalog?.printers.some((p) => p.series_id === s.id)),
    [catalog],
  );

  if (brands.length === 0) return <p className={cn("text-sm text-ink-2", className)}>{t("noBrands")}</p>;

  return (
    <div className={cn("space-y-6", className)}>
      <form
        className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const p = models.find((m) => m.id === printer);
          if (p) router.push(`/find-your-ink/printer/${p.slug}`);
        }}
      >
        <div>
          <Label htmlFor={`${id}-brand`}>{t("brand")}</Label>
          <Select id={`${id}-brand`} value={brand} onChange={(e) => chooseBrand(e.target.value)}>
            <option value="">{t("chooseBrand")}</option>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>{b.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${id}-series`}>{t("series")}</Label>
          <Select
            id={`${id}-series`}
            value={series}
            disabled={!catalog || usedSeries.length === 0}
            onChange={(e) => {
              setSeries(e.target.value);
              setPrinter("");
            }}
          >
            <option value="">{t("chooseSeries")}</option>
            {usedSeries.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${id}-model`}>{t("model")}</Label>
          <Select
            id={`${id}-model`}
            value={printer}
            disabled={!catalog || models.length === 0}
            onChange={(e) => setPrinter(e.target.value)}
            dir="ltr"
            className="rtl:text-right"
          >
            <option value="">{t("chooseModel")}</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.model}</option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={!printer} className="md:min-w-44">
          {t("show")}
          <ArrowRight className="rtl:-scale-x-100" aria-hidden />
        </Button>
      </form>
      <p aria-live="polite" className="min-h-5 text-sm text-ink-2">
        {state === "loading" ? tc("loading") : state === "error" ? t("error") : catalog && catalog.printers.length === 0 ? t("noPrinters") : ""}
      </p>
      <form action={`/${locale}/search`} method="get" className="max-w-md">
        <Label htmlFor={`${id}-q`}>{t("orSearch")}</Label>
        <div className="flex gap-2">
          <Input id={`${id}-q`} name="q" required minLength={2} maxLength={120} placeholder={t("searchPlaceholder")} dir="ltr" className="rtl:text-right" />
          <Button type="submit" variant="secondary" size="icon" aria-label={t("orSearch")}>
            <Search aria-hidden />
          </Button>
        </div>
      </form>
    </div>
  );
}
