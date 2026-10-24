"use client";

import { ChevronRight, Menu, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { LocaleLinks } from "./locale-switcher";
import { SearchBox } from "./search-box";

export type NavCategory = { slug: string; name: string; children: { slug: string; name: string }[] };

export function MobileMenu({ categories }: { categories: NavCategory[] }) {
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex size-11 items-center justify-center rounded-control hover:bg-surface lg:hidden" aria-label={t("menu")}>
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="bottom" title={t("menu")} closeLabel={tc("close")}>
        <nav aria-label={t("mainNav")} className="px-4 pb-8 pt-2">
          <ul className="divide-y divide-line">
            <li>
              <Link href="/find-your-ink" onClick={close} className="flex min-h-12 items-center justify-between font-medium">
                {t("findYourInk")}
                <ChevronRight className="size-4 text-ink-2 rtl:-scale-x-100" aria-hidden />
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug} className="py-2">
                <Link href={`/c/${c.slug}`} onClick={close} className="flex min-h-11 items-center justify-between font-medium">
                  {c.name}
                  <ChevronRight className="size-4 text-ink-2 rtl:-scale-x-100" aria-hidden />
                </Link>
                {c.children.length > 0 ? (
                  <ul className="flex flex-wrap gap-2 pb-2">
                    {c.children.map((s) => (
                      <li key={s.slug}>
                        <Link href={`/c/${s.slug}`} onClick={close} className="inline-flex min-h-9 items-center rounded-full bg-surface px-3 text-sm">
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
            <li>
              <Link href="/brands" onClick={close} className="flex min-h-12 items-center justify-between font-medium">
                {t("brands")}
                <ChevronRight className="size-4 text-ink-2 rtl:-scale-x-100" aria-hidden />
              </Link>
            </li>
            <li>
              <Link href="/track" onClick={close} className="flex min-h-12 items-center justify-between font-medium">
                {t("track")}
                <ChevronRight className="size-4 text-ink-2 rtl:-scale-x-100" aria-hidden />
              </Link>
            </li>
          </ul>
          <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-ink-2">{t("language")}</p>
          <Suspense>
            <LocaleLinks />
          </Suspense>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/** Mobile: the search field opens as a full-width overlay. */
export function MobileSearch() {
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex size-11 items-center justify-center rounded-control hover:bg-surface md:hidden" aria-label={t("openSearch")}>
        <Search className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="top" title={t("search")} closeLabel={tc("close")} className="min-h-[50dvh]">
        <div className="p-4">
          <SearchBox autoFocus onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
