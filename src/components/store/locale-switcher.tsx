"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export const LOCALE_NAMES: Record<Locale, string> = { ar: "العربية", fr: "Français", en: "English" };

function useHref() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return search ? `${pathname}?${search}` : pathname;
}

/** Inline list of languages (mobile menu, footer). */
export function LocaleLinks({ className }: { className?: string }) {
  const current = useLocale();
  const href = useHref();
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {locales.map((l) => (
        <li key={l}>
          <Link
            href={href}
            locale={l}
            lang={l}
            aria-current={l === current ? "true" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm",
              l === current ? "border-ink font-medium" : "border-line text-ink-2 hover:text-ink",
            )}
          >
            {LOCALE_NAMES[l]}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Header language menu. */
export function LocaleMenu() {
  const t = useTranslations("header");
  const current = useLocale() as Locale;
  const href = useHref();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${t("language")}: ${LOCALE_NAMES[current]}`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 text-sm hover:bg-surface"
      >
        <Globe className="size-4" aria-hidden />
        <span className="uppercase">{current}</span>
      </button>
      {open ? (
        <ul className="absolute end-0 top-full z-50 mt-1 min-w-40 rounded-card border border-line bg-bg p-1 shadow-2">
          {locales.map((l) => (
            <li key={l}>
              <Link
                href={href}
                locale={l}
                lang={l}
                onClick={() => setOpen(false)}
                aria-current={l === current ? "true" : undefined}
                className={cn("flex min-h-11 items-center rounded-control px-3 text-sm hover:bg-surface", l === current && "font-semibold")}
              >
                {LOCALE_NAMES[l]}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
