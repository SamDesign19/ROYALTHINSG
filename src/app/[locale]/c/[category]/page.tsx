import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/listing/product-listing";
import { getCategory } from "@/features/catalog/queries";
import { parseSearchParams } from "@/features/search/params";
import { searchProducts } from "@/features/search/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/localized";
import { alternates } from "@/lib/seo";

// Filters, sorting and paging come from the query string, so this page renders per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/c/[category]">): Promise<Metadata> {
  const { locale, category: slug } = await params;
  const data = await getCategory(slug);
  if (!data) return {};
  const l = locale as Locale;
  return {
    title: pick(data.category.name, l),
    description: pick(data.category.description, l) || undefined,
    alternates: alternates(locale, `/c/${slug}`),
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[locale]/c/[category]">) {
  const { locale: l, category: slug } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const data = await getCategory(slug);
  if (!data) notFound();
  const { category, ancestors, children } = data;
  const t = await getTranslations("listing");

  // The category in the path wins over any ?category= in the query string.
  const filters = { ...parseSearchParams(await searchParams), category: slug };
  const result = await searchProducts(filters);

  return (
    <div className="container-ri py-8 md:py-12">
      <Breadcrumbs items={[...ancestors.map((a) => ({ label: pick(a.name, locale), href: `/c/${a.slug}` })), { label: pick(category.name, locale) }]} />
      <h1 className="display text-2xl md:text-3xl">{pick(category.name, locale)}</h1>
      {category.description ? <p className="mt-2 max-w-[68ch] text-ink-2">{pick(category.description, locale)}</p> : null}
      {children.length > 0 ? (
        <nav aria-label={t("subcategories")} className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {children.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm hover:border-ink">
                  {pick(c.name, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <div className="mt-8">
        <ProductListing result={result} filters={filters} pathname={`/c/${slug}`} scope={{ category: slug }} hide={["category"]} />
      </div>
    </div>
  );
}
