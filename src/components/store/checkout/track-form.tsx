"use client";

import { Check, Loader2 } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import { Amount } from "@/components/store/price";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { trackOrder, type TrackState } from "@/features/checkout/track";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"];

export function TrackForm({ defaultNumber }: { defaultNumber: string }) {
  const t = useTranslations("track");
  const ts = useTranslations("orderStatus");
  const te = useTranslations("checkout.errors");
  const format = useFormatter();
  const locale = useLocale() as Locale;
  const id = useId();
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, null);
  const order = state?.order;

  return (
    <div className="space-y-8">
      <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor={`${id}-n`}>{t("number")}</Label>
          <Input id={`${id}-n`} name="number" required defaultValue={defaultNumber} placeholder={t("numberHint")} dir="ltr" className="uppercase rtl:text-right" />
        </div>
        <div>
          <Label htmlFor={`${id}-p`}>{t("phone")}</Label>
          <Input id={`${id}-p`} name="phone" type="tel" inputMode="tel" required autoComplete="tel" dir="ltr" placeholder="0551 23 45 67" className="rtl:text-right" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {t("submit")}
        </Button>
      </form>

      <div aria-live="polite">
        {state?.error ? (
          <p role="alert" className="text-sm font-medium text-accent">
            {state.error === "rate_limited" ? te("rate_limited") : t("notFound")}
          </p>
        ) : null}
        {order ? (
          <section className="space-y-6 rounded-card border border-line p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <p className="code text-xl font-semibold">{order.order_number}</p>
                <p className="text-sm text-ink-2">{t("placed", { date: format.dateTime(new Date(order.created_at), { dateStyle: "long" }) })}</p>
              </div>
              <div className="text-end">
                <p className="text-sm text-ink-2">{t("total")}</p>
                <Amount value={Number(order.total_dzd)} locale={locale} className="text-lg font-semibold" />
              </div>
            </div>
            {order.status === "cancelled" || order.status === "returned" ? (
              <p className="font-medium text-accent">{ts(order.status)}</p>
            ) : (
              <ol className="grid gap-3 sm:grid-cols-5">
                {FLOW.map((s, i) => {
                  const done = FLOW.indexOf(order.status) >= i;
                  return (
                    <li key={s} className="flex items-center gap-2 sm:flex-col sm:items-start" aria-current={order.status === s ? "step" : undefined}>
                      <span className={cn("inline-flex size-7 items-center justify-center rounded-full border text-xs", done ? "border-success bg-success text-bg" : "border-line text-ink-2")}>
                        {done ? <Check className="size-4" aria-hidden /> : i + 1}
                      </span>
                      <span className={cn("text-sm", done ? "font-medium" : "text-ink-2")}>{ts(s)}</span>
                    </li>
                  );
                })}
              </ol>
            )}
            {order.history?.length ? (
              <div>
                <h2 className="mb-2 text-sm font-semibold">{t("history")}</h2>
                <ul className="space-y-1 text-sm text-ink-2">
                  {order.history.map((h, i) => (
                    <li key={i}>
                      {format.dateTime(new Date(h.at), { dateStyle: "medium", timeStyle: "short" })} — {ts(h.status)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
