import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductGrid } from "@/components/store/product-card";
import { getCollection } from "@/features/catalog/queries";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/localized";
import { alternates } from "@/lib/seo";

export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/collections/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getCollection(slug);
  if (!data) return {};
  return {
    title: pick(data.collection.title, locale as Locale),
    description: pick(data.collection.description, locale as Locale) || undefined,
    alternates: alternates(locale, `/collections/${slug}`),
  };
}

export default async function CollectionPage({ params }: PageProps<"/[locale]/collections/[slug]">) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const data = await getCollection(slug);
  if (!data) notFound();
  const t = await getTranslations("listing");
  const title = pick(data.collection.title, locale);
  return (
    <div className="container-ri py-8 md:py-12">
      <Breadcrumbs items={[{ label: title }]} />
      <h1 className="display text-2xl md:text-3xl">{title}</h1>
      {data.collection.description ? <p className="mt-2 max-w-[68ch] text-ink-2">{pick(data.collection.description, locale)}</p> : null}
      <p className="mb-6 mt-6 text-sm text-ink-2">{t("results", { count: data.products.length })}</p>
      {data.products.length > 0 ? <ProductGrid products={data.products} priorityCount={4} /> : null}
    </div>
  );
}
