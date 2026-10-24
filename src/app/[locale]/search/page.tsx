import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductListing } from "@/components/store/listing/product-listing";
import { getPrinter } from "@/features/compatibility/queries";
import { parseSearchParams } from "@/features/search/params";
import { searchProducts } from "@/features/search/queries";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/seo";

// Filters, sorting and paging come from the query string, so this page renders per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/search">): Promise<Metadata> {
  const { locale } = await params;
  const f = parseSearchParams(await searchParams);
  const t = await getTranslations({ locale, namespace: "listing" });
  return {
    title: f.q ? t("searchTitle", { q: f.q }) : t("allProducts"),
    alternates: alternates(locale, "/search"),
    // Result pages for arbitrary queries and filters are not worth indexing.
    robots: f.q || f.page > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("listing");
  const filters = parseSearchParams(await searchParams);
  const printer = filters.printer ? await getPrinter(filters.printer) : null;
  const result = await searchProducts(filters, { printerId: printer?.id });

  return (
    <div className="container-ri py-8 md:py-12">
      <h1 className="display mb-6 text-2xl md:text-3xl">
        {filters.q ? t("searchTitle", { q: filters.q }) : t("allProducts")}
      </h1>
      <ProductListing
        result={result}
        filters={{ ...filters, printer: printer ? filters.printer : null }}
        pathname="/search"
        printerLabel={printer ? `${printer.brand.name} ${printer.model}` : null}
      />
    </div>
  );
}
