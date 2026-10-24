import { ChevronDown } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCategoryTree } from "@/features/catalog/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/localized";
import { CartButton } from "./cart/cart-button";
import { HeaderShell } from "./header-shell";
import { LocaleMenu } from "./locale-switcher";
import { Logo } from "./logo";
import { MobileMenu, MobileSearch, type NavCategory } from "./mobile-menu";
import { SearchBox } from "./search-box";

export async function Header() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("header");
  const tree = await getCategoryTree();
  const categories: NavCategory[] = tree.map((c) => ({
    slug: c.slug,
    name: pick(c.name, locale),
    children: c.children.map((s) => ({ slug: s.slug, name: pick(s.name, locale) })),
  }));

  return (
    <HeaderShell>
      <div className="container-ri relative flex h-16 items-center gap-2 sm:gap-4">
        <MobileMenu categories={categories} />
        <Link href="/" className="shrink-0 rounded-control py-2" aria-label="ROYAL INK">
          <Logo />
        </Link>
        <nav aria-label={t("mainNav")} className="hidden lg:block">
          <ul className="flex items-center">
            <li className="group flex h-16 items-center">
              <Link href="/search" className="inline-flex min-h-11 items-center gap-1 rounded-control px-3 text-sm font-medium hover:bg-surface">
                {t("categories")}
                <ChevronDown className="size-4 text-ink-2 transition-ri group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden />
              </Link>
              {/* All categories in one panel: opens on hover and on keyboard focus. */}
              <div className="invisible absolute inset-x-4 top-full z-50 opacity-0 sm:inset-x-6 lg:inset-x-8 transition-opacity duration-[var(--ri-fast)] group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="grid grid-cols-3 gap-x-6 gap-y-6 rounded-card border border-line bg-bg p-6 shadow-2 xl:grid-cols-6">
                  {categories.map((c) => (
                    <div key={c.slug}>
                      <Link href={`/c/${c.slug}`} className="mb-2 inline-flex min-h-9 items-center text-sm font-semibold hover:underline">
                        {c.name}
                      </Link>
                      <ul className="space-y-0.5">
                        {c.children.map((s) => (
                          <li key={s.slug}>
                            <Link href={`/c/${s.slug}`} className="inline-flex min-h-8 items-center text-sm text-ink-2 hover:text-ink">
                              {s.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </li>
            <li>
              <Link href="/brands" className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium hover:bg-surface">
                {t("brands")}
              </Link>
            </li>
            <li>
              <Link href="/find-your-ink" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-control bg-accent px-3 text-sm font-medium text-accent-ink hover:opacity-90">
                {t("findYourInk")}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="ms-auto flex items-center gap-1 md:flex-1 md:justify-end">
          <SearchBox className="hidden w-full max-w-md md:block" />
          <MobileSearch />
          <Suspense>
            <LocaleMenu />
          </Suspense>
          <CartButton />
        </div>
      </div>
    </HeaderShell>
  );
}
