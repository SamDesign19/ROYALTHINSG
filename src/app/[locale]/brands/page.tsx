import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { getBrands } from "@/features/catalog/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[locale]/brands">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brands" });
  return { title: t("title"), alternates: alternates(locale, "/brands") };
}

export default async function BrandsPage({ params }: PageProps<"/[locale]/brands">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("brands");
  const brands = await getBrands();
  return (
    <div className="container-ri py-8 md:py-12">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <h1 className="display text-2xl md:text-3xl">{t("title")}</h1>
      <p className="mt-2 text-ink-2">{t("intro")}</p>
      {brands.length === 0 ? (
        <p className="mt-8 text-ink-2">{t("none")}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((b) => (
            <li key={b.id}>
              <Link href={`/brands/${b.slug}`} className="flex min-h-24 items-center justify-center rounded-card border border-line p-4 text-center font-semibold transition-shadow hover:shadow-1">
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
