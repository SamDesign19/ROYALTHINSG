import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Amount } from "@/components/store/price";
import { Button } from "@/components/ui/button";
import { LAST_ORDER_COOKIE, parseLastOrder } from "@/features/checkout/last-order";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout/confirmation/[number]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "confirmation" });
  return { title: t("title"), robots: { index: false } };
}

export default async function ConfirmationPage({ params }: PageProps<"/[locale]/checkout/confirmation/[number]">) {
  const { locale: l, number: raw } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("confirmation");
  const number = decodeURIComponent(raw);
  // Only the browser that placed the order has this cookie; anyone else sees the tracking hint.
  const order = parseLastOrder((await cookies()).get(LAST_ORDER_COOKIE)?.value);
  const mine = order?.number === number ? order : null;

  return (
    <div className="container-ri flex min-h-[60dvh] max-w-2xl flex-col justify-center gap-6 py-16">
      {mine ? (
        <>
          <CheckCircle2 className="size-12 text-success" aria-hidden />
          <h1 className="display text-3xl">{t("title")}</h1>
          <dl className="grid gap-4 rounded-card bg-surface p-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-ink-2">{t("number")}</dt>
              <dd className="code text-2xl font-semibold">{mine.number}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-2">{t("total")}</dt>
              <dd className="text-2xl font-semibold"><Amount value={mine.total} locale={locale} /></dd>
            </div>
          </dl>
          <p>{t.rich("next", { phone: mine.phone, code: (c) => <bdi className="code font-medium">{c}</bdi> })}</p>
          <p className="text-ink-2">{t("codReminder")}</p>
        </>
      ) : (
        <>
          <h1 className="display text-2xl">{t("number")}: <span className="code">{number}</span></h1>
          <p className="text-ink-2">{t("notFound")}</p>
        </>
      )}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/track?number=${encodeURIComponent(number)}`}>{t("track")}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">{t("continue")}</Link>
        </Button>
      </div>
    </div>
  );
}
