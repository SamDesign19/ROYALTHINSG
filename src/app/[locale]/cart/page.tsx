import { ArrowRight, Banknote } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LineControls } from "@/components/store/cart/line-controls";
import { Amount } from "@/components/store/price";
import { ProductImage } from "@/components/store/product-image";
import { OriginBadge } from "@/components/store/origin-badge";
import { Button } from "@/components/ui/button";
import { getCartLines } from "@/features/cart/queries";
import { readCart } from "@/features/cart/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDZD } from "@/lib/format";
import { pick } from "@/lib/localized";

// Reads the shopper's cart cookie: always rendered per request, never cached or indexed.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: t("title"), robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale: l } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  const tp = await getTranslations("product");
  const th = await getTranslations("header");
  const { lines, subtotal, orderable } = await getCartLines(await readCart());

  if (lines.length === 0) {
    return (
      <div className="container-ri flex min-h-[50dvh] flex-col items-start justify-center gap-4 py-16">
        <h1 className="display text-3xl">{t("title")}</h1>
        <p className="text-lg">{t("empty")}</p>
        <p className="max-w-[60ch] text-ink-2">{t("emptyHint")}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild><Link href="/find-your-ink">{th("findYourInk")}</Link></Button>
          <Button asChild variant="secondary"><Link href="/search">{t("continue")}</Link></Button>
        </div>
      </div>
    );
  }

  const count = lines.reduce((n, l) => n + l.qty, 0);
  return (
    <div className="container-ri py-8 md:py-12">
      <h1 className="display mb-8 text-2xl md:text-3xl">{t("title")}</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => {
            const name = line.product ? pick(line.product.name, locale) : tp("unavailable");
            return (
              <li key={line.id} className="flex gap-4 py-5">
                <div className="w-20 shrink-0 overflow-hidden rounded-control sm:w-24">
                  <ProductImage path={line.product?.image_path ?? null} alt={name} type={line.product?.product_type ?? "other"} sizes="96px" noImageLabel={tp("noImage")} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    {line.product ? (
                      <>
                        <p className="text-xs text-ink-2">
                          {line.product.brand_name}
                          {line.product.model_code ? <> · <span className="code">{line.product.model_code}</span></> : null}
                        </p>
                        <Link href={`/p/${line.product.slug}`} className="line-clamp-2 font-medium hover:underline">{name}</Link>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                          <OriginBadge origin={line.product.origin} />
                          {line.unitPrice !== null ? <span>{t("unitPrice", { price: formatDZD(line.unitPrice, locale) })}</span> : null}
                        </div>
                      </>
                    ) : (
                      <p className="font-medium text-ink-2">{name}</p>
                    )}
                    {line.status !== "ok" ? (
                      <p className="text-sm font-medium text-accent">{line.status === "unavailable" ? t("lineUnavailable") : t("lineOutOfStock")}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <LineControls productId={line.id} quantity={line.qty} name={name} canChange={line.status === "ok"} />
                    {line.status === "ok" ? <Amount value={line.lineTotal} locale={locale} className="font-semibold" /> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit space-y-4 rounded-card bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">{t("summary")}</h2>
          <div className="flex items-baseline justify-between">
            <span className="text-ink-2">{t("subtotal")} · {t("items", { count })}</span>
            <Amount value={subtotal} locale={locale} className="text-xl font-semibold" />
          </div>
          <p className="text-sm text-ink-2">{t("deliveryNote")}</p>
          <p className="flex items-center gap-2 text-sm"><Banknote className="size-4" aria-hidden />{t("cod")}</p>
          {orderable ? (
            <Button asChild size="lg" className="w-full">
              <Link href="/checkout">
                {t("checkout")}
                <ArrowRight className="rtl:-scale-x-100" aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled>{t("checkout")}</Button>
          )}
          <Link href="/search" className="block text-center text-sm underline-offset-4 hover:underline">{t("continue")}</Link>
        </aside>
      </div>
    </div>
  );
}
