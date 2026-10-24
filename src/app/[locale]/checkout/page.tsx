import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/store/checkout/checkout-form";
import { Amount } from "@/components/store/price";
import { Button } from "@/components/ui/button";
import { getCartLines } from "@/features/cart/queries";
import { readCart } from "@/features/cart/server";
import { getDeliveryOptions } from "@/features/checkout/queries";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/localized";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale: l } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");
  const tc = await getTranslations("cart");
  const [{ lines, subtotal, orderable }, delivery] = await Promise.all([readCart().then(getCartLines), getDeliveryOptions()]);
  // Problems with the cart (empty, unavailable lines) are fixed on the cart page.
  if (!orderable) redirect({ href: "/cart", locale });

  return (
    <div className="container-ri py-8 md:py-12">
      <h1 className="display mb-8 text-2xl md:text-3xl">{t("title")}</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="max-w-2xl">
          {delivery.wilayas.length === 0 ? (
            <p role="status" className="rounded-card border border-dashed border-line p-6 text-ink-2">{t("noDelivery")}</p>
          ) : (
            <CheckoutForm
              wilayas={delivery.wilayas.map((w) => ({ code: w.code, name: pick(w.name, locale), rates: w.rates }))}
              pickupPoints={delivery.pickupPoints}
              subtotal={subtotal}
              productNames={Object.fromEntries(lines.filter((x) => x.product).map((x) => [x.product!.sku, pick(x.product!.name, locale)]))}
            />
          )}
        </div>
        <aside className="h-fit rounded-card border border-line p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-lg font-semibold">{tc("summary")}</h2>
          <ul className="space-y-3 text-sm">
            {lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-4">
                <span className="min-w-0">
                  <span className="line-clamp-2">{pick(line.product?.name, locale)}</span>
                  <span className="text-ink-2 tabular-nums">× {line.qty}</span>
                </span>
                <Amount value={line.lineTotal} locale={locale} className="shrink-0" />
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-ink-2">{tc("subtotal")}</span>
            <Amount value={subtotal} locale={locale} className="font-semibold" />
          </div>
          <Button asChild variant="quiet" size="sm" className="mt-3 px-0">
            <Link href="/cart">{tc("title")}</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
