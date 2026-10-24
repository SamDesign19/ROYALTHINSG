import { BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/listing/product-listing";
import { Button } from "@/components/ui/button";
import { getPrinter } from "@/features/compatibility/queries";
import { parseSearchParams } from "@/features/search/params";
import { searchProducts } from "@/features/search/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/seo";

// Filters, sorting and paging come from the query string, so this page renders per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/find-your-ink/printer/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const printer = await getPrinter(slug);
  if (!printer) return {};
  const t = await getTranslations({ locale, namespace: "printer" });
  const label = `${printer.brand.name} ${printer.model}`;
  return {
    title: t.markup("suppliesFor", { printer: label, code: (c) => c }),
    description: t.markup("intro", { printer: label, code: (c) => c }),
    alternates: alternates(locale, `/find-your-ink/printer/${slug}`),
  };
}

export default async function PrinterPage({ params, searchParams }: PageProps<"/[locale]/find-your-ink/printer/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  const printer = await getPrinter(slug);
  if (!printer) notFound();
  const t = await getTranslations("printer");
  const tf = await getTranslations("findInk");
  const tk = await getTranslations("kinds");
  const label = `${printer.brand.name} ${printer.model}`;

  const filters = { ...parseSearchParams(await searchParams), printer: slug };
  const result = await searchProducts(filters, { printerId: printer.id });

  return (
    <div className="container-ri py-8 md:py-12">
      <Breadcrumbs items={[{ label: tf("title"), href: "/find-your-ink" }, { label }]} />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-ink-2">
            {printer.brand.name}
            {printer.series ? <> · <bdi>{printer.series.name}</bdi></> : null} · {tk(printer.kind)}
          </p>
          <h1 className="display text-2xl md:text-3xl">{t.rich("suppliesFor", { printer: label, code: (c) => <bdi className="code">{c}</bdi> })}</h1>
          <p className="flex items-center gap-2 text-sm text-success">
            <BadgeCheck className="size-4 shrink-0" aria-hidden />
            {t.rich("intro", { printer: label, code: (c) => <bdi className="code">{c}</bdi> })}
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/find-your-ink">{t("otherPrinter")}</Link>
        </Button>
      </div>
      <ProductListing
        result={result}
        filters={filters}
        pathname={`/find-your-ink/printer/${slug}`}
        scope={{ printer: slug }}
        empty={<p className="font-medium">{t("none")}</p>}
      />
    </div>
  );
}
