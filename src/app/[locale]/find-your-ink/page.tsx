import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { FindYourInk } from "@/components/store/find-your-ink";
import { getBrands } from "@/features/catalog/queries";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[locale]/find-your-ink">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "findInk" });
  return { title: t("title"), description: t("intro"), alternates: alternates(locale, "/find-your-ink") };
}

export default async function FindYourInkPage({ params }: PageProps<"/[locale]/find-your-ink">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("findInk");
  const brands = (await getBrands()).filter((b) => b.makes_printers).map((b) => ({ slug: b.slug, name: b.name }));
  return (
    <div className="container-ri py-8 md:py-12">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <h1 className="display text-3xl md:text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-[68ch] text-lg text-ink-2">{t("intro")}</p>
      <div className="mt-8 rounded-card border border-line p-5 sm:p-8">
        <FindYourInk brands={brands} />
      </div>
    </div>
  );
}
