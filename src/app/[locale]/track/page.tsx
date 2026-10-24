import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { TrackForm } from "@/components/store/checkout/track-form";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/track">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "track" });
  return { title: t("title"), alternates: alternates(locale, "/track") };
}

export default async function TrackPage({ params, searchParams }: PageProps<"/[locale]/track">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("track");
  const number = (await searchParams).number;
  return (
    <div className="container-ri max-w-2xl py-8 md:py-12">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <h1 className="display text-2xl md:text-3xl">{t("title")}</h1>
      <p className="mb-8 mt-2 text-ink-2">{t("intro")}</p>
      <TrackForm defaultNumber={typeof number === "string" ? number.slice(0, 40) : ""} />
    </div>
  );
}
