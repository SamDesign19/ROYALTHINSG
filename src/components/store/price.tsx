import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { currencyLabel, discountPercent, formatAmount, formatDZD } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "18 000 DA": the number is an LTR run with tabular figures, the currency follows the language. */
export function Amount({ value, locale, className }: { value: number; locale: Locale; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap", className)}>
      <bdi dir="ltr" className="tabular-nums">{formatAmount(value)}</bdi> {currencyLabel(locale)}
    </span>
  );
}

export function Price({
  price,
  compareAt,
  locale,
  size = "md",
  className,
}: {
  price: number;
  compareAt?: number | null;
  locale: Locale;
  size?: "md" | "lg";
  className?: string;
}) {
  const t = useTranslations("product");
  const pct = discountPercent(price, compareAt);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <Amount
        value={price}
        locale={locale}
        className={cn("font-semibold", size === "lg" ? "text-2xl" : "text-base", pct ? "text-accent" : "text-ink")}
      />
      {pct && compareAt ? (
        <>
          <span className="sr-only">{t("wasPrice", { price: formatDZD(compareAt, locale) })}</span>
          <s aria-hidden className={cn("text-ink-2", size === "lg" ? "text-base" : "text-sm")}>
            <Amount value={compareAt} locale={locale} />
          </s>
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink">
            {t("save", { percent: pct })}
          </span>
        </>
      ) : null}
    </div>
  );
}
