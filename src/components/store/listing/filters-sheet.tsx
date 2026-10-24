"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { SearchFilters } from "@/features/search/params";
import { FilterPanel, type FacetOptions, type ListingScope } from "./filter-panel";

/** Mobile: filters in a full-height sheet with a sticky "Show N results" button. */
export function FiltersSheet(props: {
  filters: SearchFilters;
  facets: FacetOptions;
  pathname: string;
  scope: ListingScope;
  hide?: ("brand" | "category")[];
  activeCount: number;
}) {
  const t = useTranslations("filters");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const { activeCount, ...panel } = props;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex min-h-10 items-center gap-2 rounded-control border border-line px-4 text-sm font-medium lg:hidden">
        <SlidersHorizontal className="size-4" aria-hidden />
        {t("button")}
        {activeCount > 0 ? <span className="rounded-full bg-ink px-1.5 text-xs text-bg tabular-nums">{activeCount}</span> : null}
      </SheetTrigger>
      <SheetContent side="bottom" title={t("title")} closeLabel={tc("close")} className="h-[90dvh]">
        <div className="flex min-h-full flex-col pt-4">
          <FilterPanel {...panel} mode="sheet" onApplied={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
