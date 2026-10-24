import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <div className="container-ri flex min-h-[60dvh] flex-col items-start justify-center gap-4 py-16">
      <p className="code text-sm font-medium text-accent">404</p>
      <h1 className="display text-3xl">{t("notFoundTitle")}</h1>
      <p className="max-w-[68ch] text-ink-2">{t("notFoundText")}</p>
      <Button asChild variant="secondary">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}
