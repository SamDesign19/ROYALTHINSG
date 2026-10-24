"use client";

import { Folder, Printer, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDZD } from "@/lib/format";
import { pick, type Localized } from "@/lib/localized";
import { cn } from "@/lib/utils";

type Suggestions = {
  products: { slug: string; name: Localized; model_code: string | null; price_dzd: number }[];
  printers: { id: string; slug: string; model: string; brand: string }[];
  categories: { slug: string; name: Localized }[];
};

type Option = { key: string; href: string; label: string; detail?: string; kind: "product" | "printer" | "category" | "all" };

/**
 * Search field with autocomplete (products, printer models, categories) from search_suggestions().
 * Works as a plain GET form without JavaScript.
 */
export function SearchBox({ autoFocus, onNavigate, className }: { autoFocus?: boolean; onNavigate?: () => void; className?: string }) {
  const t = useTranslations("header");
  const ts = useTranslations("suggest");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapper = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return; // the list is hidden below two characters
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Suggestions | null) => {
          setData(d);
          setActive(-1);
        })
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const groups = useMemo(() => {
    if (!data) return [];
    const products: Option[] = data.products.map((p) => ({
      key: `p-${p.slug}`,
      href: `/p/${p.slug}`,
      label: pick(p.name, locale),
      detail: formatDZD(p.price_dzd, locale),
      kind: "product",
    }));
    const printers: Option[] = data.printers.map((p) => ({
      key: `pr-${p.id}`,
      href: `/find-your-ink/printer/${p.slug}`,
      label: `${p.brand} ${p.model}`,
      kind: "printer",
    }));
    const categories: Option[] = data.categories.map((c) => ({
      key: `c-${c.slug}`,
      href: `/c/${c.slug}`,
      label: pick(c.name, locale),
      kind: "category",
    }));
    return [
      { title: ts("printers"), options: printers },
      { title: ts("products"), options: products },
      { title: ts("categories"), options: categories },
    ].filter((g) => g.options.length > 0);
  }, [data, locale, ts]);

  const query = q.trim();
  const all: Option = { key: "all", href: `/search?q=${encodeURIComponent(query)}`, label: ts("seeAll", { q: query }), kind: "all" };
  const flat = [...groups.flatMap((g) => g.options), ...(query ? [all] : [])];
  const showList = open && query.length >= 2 && data !== null;

  function go(href: string) {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  return (
    <form
      ref={wrapper}
      role="search"
      action={`/${locale}/search`}
      method="get"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const option = flat[active];
        if (option) go(option.href);
        else if (query) go(`/search?q=${encodeURIComponent(query)}`);
      }}
    >
      <label htmlFor={`${id}-input`} className="sr-only">
        {t("searchLabel")}
      </label>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-2" aria-hidden />
      <input
        id={`${id}-input`}
        name="q"
        type="search"
        value={q}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={120}
        placeholder={t("searchPlaceholder")}
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 && flat[active] ? `${id}-${flat[active].key}` : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, flat.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          } else if (e.key === "Escape") {
            setOpen(false);
            setActive(-1);
          }
        }}
        className="min-h-11 w-full rounded-full border border-line bg-surface ps-10 pe-4 text-base text-ink placeholder:text-ink-2 focus-visible:border-ink focus-visible:bg-bg focus-visible:outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {showList ? (
        <div
          id={`${id}-list`}
          role="listbox"
          aria-label={t("searchLabel")}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70dvh] overflow-y-auto rounded-card border border-line bg-bg p-2 shadow-2"
        >
          {groups.length === 0 ? <p className="px-3 py-2 text-sm text-ink-2">{ts("none")}</p> : null}
          {groups.map((g) => (
            <div key={g.title} role="group" aria-label={g.title} className="py-1">
              <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-ink-2">{g.title}</p>
              {g.options.map((o) => (
                <SuggestionRow key={o.key} id={`${id}-${o.key}`} option={o} active={flat[active]?.key === o.key} onPick={go} />
              ))}
            </div>
          ))}
          {query ? (
            <div className="border-t border-line pt-1">
              <SuggestionRow id={`${id}-all`} option={all} active={flat[active]?.key === "all"} onPick={go} />
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function SuggestionRow({ id, option, active, onPick }: { id: string; option: Option; active: boolean; onPick: (href: string) => void }) {
  const Icon = option.kind === "printer" ? Printer : option.kind === "category" ? Folder : option.kind === "all" ? Search : null;
  return (
    <Link
      id={id}
      role="option"
      aria-selected={active}
      href={option.href}
      onClick={(e) => {
        e.preventDefault();
        onPick(option.href);
      }}
      className={cn("flex min-h-11 items-center gap-3 rounded-control px-3 text-sm", active ? "bg-surface" : "hover:bg-surface")}
    >
      {Icon ? <Icon className="size-4 shrink-0 text-ink-2" aria-hidden /> : null}
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {option.detail ? <span className="shrink-0 text-xs text-ink-2 tabular-nums">{option.detail}</span> : null}
    </Link>
  );
}
