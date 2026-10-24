import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ProductGrid } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { getBrands, getCategories } from "@/features/catalog/queries";
import { activeFilterCount, toSearchParams, type SearchFilters } from "@/features/search/params";
import type { SearchResult } from "@/features/search/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDZD } from "@/lib/format";
import { pick } from "@/lib/localized";
import { FilterPanel, type FacetOptions, type ListingScope } from "./filter-panel";
import { FiltersSheet } from "./filters-sheet";
import { SortSelect } from "./sort-select";

type Hide = ("brand" | "category")[];

/** Removes the page's fixed scope from the filters, so URLs only carry what the shopper chose. */
function withoutScope(f: SearchFilters, scope: ListingScope): SearchFilters {
  return {
    ...f,
    category: scope.category ? null : f.category,
    brands: scope.brand ? f.brands.filter((b) => b !== scope.brand) : f.brands,
    printer: scope.printer ? null : f.printer,
  };
}

function href(pathname: string, f: Partial<SearchFilters>) {
  const qs = toSearchParams(f).toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

async function facetOptions(locale: Locale): Promise<FacetOptions> {
  const [brands, categories] = await Promise.all([getBrands(), getCategories()]);
  const byParent = new Map<string | null, typeof categories>();
  for (const c of categories) byParent.set(c.parent_id, [...(byParent.get(c.parent_id) ?? []), c]);
  const flat: FacetOptions["categories"] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of byParent.get(parent) ?? []) {
      flat.push({ slug: c.slug, name: pick(c.name, locale), depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return { brands: brands.map((b) => ({ slug: b.slug, name: b.name })), categories: flat };
}

export async function ProductListing({
  result,
  filters: scoped,
  pathname,
  scope = {},
  hide = [],
  printerLabel,
  empty,
}: {
  result: SearchResult;
  filters: SearchFilters;
  pathname: string;
  scope?: ListingScope;
  hide?: Hide;
  printerLabel?: string | null;
  empty?: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("listing");
  const tf = await getTranslations("filters");
  const tTypes = await getTranslations("types");
  const tColors = await getTranslations("colors");
  const tOrigins = await getTranslations("origins");
  const facets = await facetOptions(locale);
  const filters = withoutScope(scoped, scope);
  const base = { ...filters, page: 1 };

  // Chips for every active filter, each linking to the same listing without it.
  const chips: { label: string; href: string }[] = [
    ...(filters.category ? [{ label: facets.categories.find((c) => c.slug === filters.category)?.name ?? filters.category, href: href(pathname, { ...base, category: null }) }] : []),
    ...filters.brands.map((b) => ({ label: facets.brands.find((x) => x.slug === b)?.name ?? b, href: href(pathname, { ...base, brands: filters.brands.filter((x) => x !== b) }) })),
    ...(filters.origin ? [{ label: tOrigins(filters.origin), href: href(pathname, { ...base, origin: null }) }] : []),
    ...filters.types.map((v) => ({ label: tTypes(v), href: href(pathname, { ...base, types: filters.types.filter((x) => x !== v) }) })),
    ...filters.colors.map((v) => ({ label: tColors(v), href: href(pathname, { ...base, colors: filters.colors.filter((x) => x !== v) }) })),
    ...(filters.minPrice !== null ? [{ label: `≥ ${formatDZD(filters.minPrice, locale)}`, href: href(pathname, { ...base, minPrice: null }) }] : []),
    ...(filters.maxPrice !== null ? [{ label: `≤ ${formatDZD(filters.maxPrice, locale)}`, href: href(pathname, { ...base, maxPrice: null }) }] : []),
    ...(filters.inStock ? [{ label: tf("inStock"), href: href(pathname, { ...base, inStock: false }) }] : []),
    ...(filters.printer ? [{ label: printerLabel ?? filters.printer, href: href(pathname, { ...base, printer: null }) }] : []),
  ];
  const clearHref = href(pathname, { q: filters.q, sort: filters.sort });
  const query = toSearchParams(filters).toString();
  const panel = { filters, facets, pathname, scope, hide };

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block" aria-label={tf("title")}>
        <h2 className="mb-4 text-base font-semibold">{tf("title")}</h2>
        <FilterPanel {...panel} mode="rail" />
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-2" aria-live="polite">{t("results", { count: result.total })}</p>
          <div className="flex items-center gap-2">
            <FiltersSheet {...panel} activeCount={activeFilterCount(filters)} />
            <SortSelect value={filters.sort} hasQuery={Boolean(filters.q)} pathname={pathname} query={query} />
          </div>
        </div>

        {chips.length > 0 ? (
          <ul className="mb-6 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <li key={c.href + c.label}>
                <Link
                  href={c.href}
                  scroll={false}
                  aria-label={tf("remove", { name: c.label })}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface ps-3 pe-2 text-sm hover:bg-line"
                >
                  <bdi>{c.label}</bdi>
                  <X className="size-3.5" aria-hidden />
                </Link>
              </li>
            ))}
            <li>
              <Link href={clearHref} scroll={false} className="inline-flex min-h-9 items-center px-2 text-sm font-medium underline-offset-4 hover:underline">
                {t("clearFilters")}
              </Link>
            </li>
          </ul>
        ) : null}

        {result.items.length > 0 ? (
          <>
            <ProductGrid products={result.items} priorityCount={4} />
            <Pagination pathname={pathname} filters={filters} page={result.page} pageCount={result.pageCount} />
          </>
        ) : (
          <div className="rounded-card border border-dashed border-line p-8 text-center sm:p-12">
            {empty ?? (
              <>
                <p className="font-medium">{t("noResults")}</p>
                <p className="mt-2 text-sm text-ink-2">{t("noResultsHint")}</p>
              </>
            )}
            {chips.length > 0 ? (
              <Button asChild variant="secondary" className="mt-6">
                <Link href={clearHref}>{t("clearFilters")}</Link>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

async function Pagination({ pathname, filters, page, pageCount }: { pathname: string; filters: SearchFilters; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const t = await getTranslations("listing");
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const item = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-3 text-sm tabular-nums";
  return (
    <nav aria-label={t("pagination")} className="mt-10 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(pathname, { ...filters, page: page - 1 })} className={`${item} hover:bg-surface`} aria-label={t("previous")} rel="prev">
          <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      ) : null}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - pages[i - 1]! > 1 ? <span className="px-1 text-ink-2" aria-hidden>…</span> : null}
          <Link
            href={href(pathname, { ...filters, page: p })}
            aria-current={p === page ? "page" : undefined}
            className={`${item} ${p === page ? "bg-ink text-bg" : "hover:bg-surface"}`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={href(pathname, { ...filters, page: page + 1 })} className={`${item} hover:bg-surface`} aria-label={t("next")} rel="next">
          <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      ) : null}
      <span className="sr-only">{t("page", { page, count: pageCount })}</span>
    </nav>
  );
}
