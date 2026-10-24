import { BadgeCheck, Banknote, PackageSearch, Truck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCategoryTree } from "@/features/catalog/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/localized";
import { LocaleLinks } from "./locale-switcher";
import { Logo } from "./logo";

export async function Footer() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("footer");
  const th = await getTranslations("header");
  const tree = await getCategoryTree();
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-ri grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm space-y-4">
          <Logo />
          <p className="text-sm text-ink-2">{t("tagline")}</p>
          <Suspense>
            <LocaleLinks />
          </Suspense>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("shop")}</h2>
          <ul className="space-y-1 text-sm text-ink-2">
            {tree.map((c) => (
              <li key={c.slug}>
                <Link href={`/c/${c.slug}`} className="inline-flex min-h-9 items-center hover:text-ink">
                  {pick(c.name, locale)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/find-your-ink" className="inline-flex min-h-9 items-center hover:text-ink">{th("findYourInk")}</Link>
            </li>
            <li>
              <Link href="/brands" className="inline-flex min-h-9 items-center hover:text-ink">{th("brands")}</Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("help")}</h2>
          <ul className="space-y-3 text-sm text-ink-2">
            <li className="flex items-center gap-2"><Banknote className="size-4 shrink-0" aria-hidden />{t("cod")}</li>
            <li className="flex items-center gap-2"><Truck className="size-4 shrink-0" aria-hidden />{t("delivery")}</li>
            <li className="flex items-center gap-2"><BadgeCheck className="size-4 shrink-0" aria-hidden />{t("verified")}</li>
            <li>
              <Link href="/track" className="inline-flex min-h-9 items-center gap-2 hover:text-ink"><PackageSearch className="size-4 shrink-0" aria-hidden />{th("track")}</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-ri py-6 text-xs text-ink-2">{t("rights", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
