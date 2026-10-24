import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export type Crumb = { label: string; href?: string };

export async function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = await getTranslations("common");
  const all: Crumb[] = [{ label: t("home"), href: "/" }, ...items];
  return (
    <nav aria-label={t("breadcrumb")} className="mb-4 text-sm text-ink-2">
      <ol className="flex flex-wrap items-center gap-1">
        {all.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3.5 rtl:-scale-x-100" aria-hidden /> : null}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className="hover:text-ink">{c.label}</Link>
            ) : (
              <span aria-current={i === all.length - 1 ? "page" : undefined} className="text-ink">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
