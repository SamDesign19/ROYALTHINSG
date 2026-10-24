import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCategoryTree } from "@/features/catalog/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/localized";
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
      <div className="container-ri flex h-16 items-center gap-2 sm:gap-4">
        <MobileMenu categories={categories} />
        <Link href="/" className="shrink-0 rounded-control py-2" aria-label="ROYAL INK">
          <Logo />
        </Link>
        <nav aria-label={t("mainNav")} className="hidden lg:block">
          <ul className="flex items-center">
            {categories.map((c) => (
              <li key={c.slug} className="group relative">
                <Link href={`/c/${c.slug}`} className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium hover:bg-surface">
                  {c.name}
                </Link>
                {c.children.length > 0 ? (
                  <div className="invisible absolute start-0 top-full z-50 pt-1 opacity-0 transition-opacity duration-[var(--ri-fast)] group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <ul className="min-w-56 rounded-card border border-line bg-bg p-1 shadow-2">
                      {c.children.map((s) => (
                        <li key={s.slug}>
                          <Link href={`/c/${s.slug}`} className="flex min-h-10 items-center rounded-control px-3 text-sm hover:bg-surface">
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
            <li>
              <Link href="/find-your-ink" className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium text-accent hover:bg-surface">
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
        </div>
      </div>
    </HeaderShell>
  );
}
