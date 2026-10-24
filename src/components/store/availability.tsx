import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function Availability({ inStock, lowStock, className }: { inStock: boolean; lowStock: boolean; className?: string }) {
  const t = useTranslations("product");
  const state = !inStock ? "out" : lowStock ? "low" : "in";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          state === "in" && "bg-success",
          state === "low" && "bg-warning",
          state === "out" && "bg-ink-2/50",
        )}
      />
      <span className={cn(state === "in" && "text-success", state === "low" && "text-warning", state === "out" && "text-ink-2")}>
        {state === "in" ? t("inStock") : state === "low" ? t("lowStock") : t("outOfStock")}
      </span>
    </span>
  );
}
