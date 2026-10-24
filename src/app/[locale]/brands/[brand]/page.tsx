import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/listing/product-listing";
import { getBrand } from "@/features/catalog/queries";
import { parseSearchParams } from "@/features/search/params";
import { searchProducts } from "@/features/search/queries";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/seo";

// Filters, sorting and paging come from the query string, so this page renders per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/brands/[brand]">): Promise<Metadata> {
  const { locale, brand: slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return {};
  const t = await getTranslations({ locale, namespace: "brands" });
  return { title: t("products", { brand: brand.name }), alternates: alternates(locale, `/brands/${slug}`) };
}

export default async function BrandPage({ params, searchParams }: PageProps<"/[locale]/brands/[brand]">) {
  const { locale, brand: slug } = await params;
  setRequestLocale(locale as Locale);
  const brand = await getBrand(slug);
  if (!brand) notFound();
  const t = await getTranslations("brands");
  const filters = { ...parseSearchParams(await searchParams), brands: [slug] };
  const result = await searchProducts(filters);
  return (
    <div className="container-ri py-8 md:py-12">
      <Breadcrumbs items={[{ label: t("title"), href: "/brands" }, { label: brand.name }]} />
      <h1 className="display mb-8 text-2xl md:text-3xl">{t("products", { brand: brand.name })}</h1>
      <ProductListing result={result} filters={filters} pathname={`/brands/${slug}`} scope={{ brand: slug }} hide={["brand"]} />
    </div>
  );
}
