"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-ri flex min-h-[60dvh] flex-col items-start justify-center gap-4 py-16">
      <h1 className="display text-3xl">{t("errorTitle")}</h1>
      <p className="max-w-[68ch] text-ink-2">{t("errorText")}</p>
      <Button onClick={reset}>{t("retry")}</Button>
    </div>
  );
}
