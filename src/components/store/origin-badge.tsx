import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Origin } from "@/features/catalog/types";
import { Badge } from "@/components/ui/badge";

/** Original (OEM) vs compatible is always stated, never implied. */
export function OriginBadge({ origin, className }: { origin: Origin | null; className?: string }) {
  const t = useTranslations("origins");
  if (!origin) return null;
  return origin === "original" ? (
    <Badge variant="ink" className={className}>
      <BadgeCheck className="size-3.5" aria-hidden />
      {t("original")}
    </Badge>
  ) : (
    <Badge variant="outline" className={className}>
      {t("compatible")}
    </Badge>
  );
}
