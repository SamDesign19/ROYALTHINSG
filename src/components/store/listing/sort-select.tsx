"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { Select } from "@/components/ui/field";
import { SORTS, type Sort } from "@/features/search/params";
import { useRouter } from "@/i18n/navigation";

export function SortSelect({ value, hasQuery, pathname, query }: { value: Sort; hasQuery: boolean; pathname: string; query: string }) {
  const t = useTranslations("sort");
  const router = useRouter();
  const id = useId();
  // Relevance is meaningful only for text searches.
  const options = SORTS.filter((s) => s !== "relevance" || hasQuery);
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="hidden text-sm text-ink-2 sm:block">{t("label")}</label>
      <Select
        id={id}
        value={value}
        aria-label={t("label")}
        className="min-h-10 w-auto py-0"
        onChange={(e) => {
          const p = new URLSearchParams(query);
          p.delete("page");
          if (e.target.value === (hasQuery ? "relevance" : "popular")) p.delete("sort");
          else p.set("sort", e.target.value);
          const qs = p.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }}
      >
        {options.map((s) => (
          <option key={s} value={s}>{t(s)}</option>
        ))}
      </Select>
    </div>
  );
}
