"use client";

import { Banknote, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useMemo, useState, useTransition } from "react";
import { Amount } from "@/components/store/price";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { placeOrder, type CheckoutState } from "@/features/checkout/actions";
import type { DeliveryMethod, DeliveryRate, PickupPoint } from "@/features/checkout/queries";
import type { Locale } from "@/i18n/routing";
import { pick, type Localized } from "@/lib/localized";
import { normalizeDzPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export type WilayaChoice = { code: number; name: string; rates: DeliveryRate[] };

export function CheckoutForm({
  wilayas,
  pickupPoints,
  subtotal,
  productNames,
}: {
  wilayas: WilayaChoice[];
  pickupPoints: PickupPoint[];
  subtotal: number;
  productNames: Record<string, string>; // sku -> name, to explain stock errors
}) {
  const t = useTranslations("checkout");
  const locale = useLocale() as Locale;
  const id = useId();
  const [state, formAction] = useActionState<CheckoutState, FormData>(placeOrder, null);
  const [pending, start] = useTransition();
  const [wilaya, setWilaya] = useState<number | null>(wilayas.length === 1 ? wilayas[0]!.code : null);
  const [method, setMethod] = useState<DeliveryMethod>("home");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [communes, setCommunes] = useState<{ id: number; name: Localized }[]>([]);

  const selected = wilayas.find((w) => w.code === wilaya) ?? null;
  const methods = (selected?.rates.map((r) => r.method) ?? []) as DeliveryMethod[];
  const activeMethod: DeliveryMethod = methods.includes(method) ? method : (methods[0] ?? "home");
  const rate = selected?.rates.find((r) => r.method === activeMethod) ?? null;
  const fee = rate ? (rate.free_over_dzd !== null && subtotal >= rate.free_over_dzd ? 0 : rate.fee_dzd) : null;
  const points = useMemo(() => pickupPoints.filter((p) => p.wilaya_code === wilaya), [pickupPoints, wilaya]);

  useEffect(() => {
    if (!wilaya) return;
    const ctrl = new AbortController();
    fetch(`/api/communes?wilaya=${wilaya}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: number; name: Localized }[]) => setCommunes(Array.isArray(list) ? list : []))
      .catch(() => {});
    return () => ctrl.abort();
  }, [wilaya]);

  const phoneInvalid = phoneTouched && phone.trim() !== "" && normalizeDzPhone(phone) === null;
  const errorField = state?.field;
  const errorMessage = state?.error
    ? state.error === "insufficient_stock"
      ? t("errors.insufficient_stock", { product: (state.detail && productNames[state.detail]) || state.detail || "" })
      : t(`errors.${state.error}`)
    : null;
  const fieldError = (name: string) => (errorField === name ? errorMessage : null);

  return (
    <form
      noValidate
      className="space-y-10"
      onSubmit={(e) => {
        e.preventDefault();
        setPhoneTouched(true);
        const data = new FormData(e.currentTarget);
        // Submitted through a transition (not the form `action` prop) so the inputs keep their values after an error.
        start(() => formAction(data));
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="method" value={activeMethod} />
      {/* Honeypot: hidden from people and assistive technology, filled only by bots. */}
      <div aria-hidden className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      {errorMessage ? (
        <p role="alert" className="rounded-control border border-danger/40 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
          {errorMessage}
        </p>
      ) : null}

      <fieldset className="space-y-4">
        <legend className="mb-4 text-lg font-semibold">{t("contact")}</legend>
        <Field id={`${id}-name`} label={t("name")} error={fieldError("name")}>
          <Input id={`${id}-name`} name="name" required autoComplete="name" maxLength={120} aria-invalid={errorField === "name" || undefined} />
        </Field>
        <Field id={`${id}-phone`} label={t("phone")} hint={t("phoneHint")} error={phoneInvalid ? t("errors.invalid_phone") : fieldError("phone")}>
          <Input
            id={`${id}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            dir="ltr"
            maxLength={20}
            placeholder="0551 23 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            aria-invalid={phoneInvalid || errorField === "phone" || undefined}
            className="rtl:text-right"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-email`} label={t("email")}>
            <Input id={`${id}-email`} name="email" type="email" autoComplete="email" dir="ltr" maxLength={200} className="rtl:text-right" />
          </Field>
          <Field id={`${id}-company`} label={t("company")}>
            <Input id={`${id}-company`} name="company" autoComplete="organization" maxLength={200} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-4 text-lg font-semibold">{t("delivery")}</legend>
        <Field id={`${id}-wilaya`} label={t("wilaya")} error={fieldError("wilaya")}>
          <Select
            id={`${id}-wilaya`}
            name="wilaya"
            required
            value={wilaya ?? ""}
            onChange={(e) => {
              setWilaya(e.target.value ? Number(e.target.value) : null);
              setCommunes([]);
            }}
            aria-invalid={errorField === "wilaya" || undefined}
          >
            <option value="">{t("chooseWilaya")}</option>
            {wilayas.map((w) => (
              <option key={w.code} value={w.code}>{String(w.code).padStart(2, "0")} — {w.name}</option>
            ))}
          </Select>
        </Field>

        {selected ? (
          <div role="radiogroup" aria-label={t("method")} className="grid gap-3 sm:grid-cols-2">
            {selected.rates.map((r) => {
              const rFee = r.free_over_dzd !== null && subtotal >= r.free_over_dzd ? 0 : r.fee_dzd;
              return (
                <label
                  key={r.method}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-card border p-4",
                    activeMethod === r.method ? "border-ink" : "border-line hover:border-ink-2",
                  )}
                >
                  <input type="radio" name="method-choice" value={r.method} checked={activeMethod === r.method} onChange={() => setMethod(r.method)} className="mt-1 size-4 accent-ink" />
                  <span className="space-y-1">
                    <span className="block font-medium">{r.method === "home" ? t("home") : t("pickup")}</span>
                    <span className="block text-sm text-ink-2">
                      {rFee === 0 ? t("free") : <Amount value={rFee} locale={locale} />}
                      {r.eta_min_days !== null && r.eta_max_days !== null ? <> · {t("eta", { min: r.eta_min_days, max: r.eta_max_days })}</> : null}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}

        {selected && communes.length > 0 ? (
          <Field id={`${id}-commune`} label={t("commune")} error={fieldError("commune")}>
            <Select id={`${id}-commune`} name="commune" defaultValue="">
              <option value="">{t("chooseCommune")}</option>
              {communes.map((c) => (
                <option key={c.id} value={c.id}>{pick(c.name, locale)}</option>
              ))}
            </Select>
          </Field>
        ) : null}

        {selected && activeMethod === "home" ? (
          <Field id={`${id}-address`} label={t("address")} hint={t("addressHint")} error={fieldError("address")}>
            <Input id={`${id}-address`} name="address" required autoComplete="street-address" maxLength={300} aria-invalid={errorField === "address" || undefined} />
          </Field>
        ) : null}

        {selected && activeMethod === "pickup" ? (
          points.length > 0 ? (
            <Field id={`${id}-pickup`} label={t("pickupPoint")} error={fieldError("pickup")}>
              <Select id={`${id}-pickup`} name="pickup" required defaultValue="" aria-invalid={errorField === "pickup" || undefined}>
                <option value="">{t("choosePickup")}</option>
                {points.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.address}</option>
                ))}
              </Select>
            </Field>
          ) : (
            <p className="text-sm text-ink-2">{t("noPickup")}</p>
          )
        ) : null}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-4 text-lg font-semibold">{t("payment")}</legend>
        <div className="flex gap-3 rounded-card border border-ink p-4">
          <Banknote className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{t("codTitle")}</p>
            <p className="text-sm text-ink-2">{t("codText")}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-promo`} label={t("promo")} error={fieldError("promo")}>
            <Input id={`${id}-promo`} name="promo" autoComplete="off" maxLength={40} dir="ltr" className="uppercase rtl:text-right" aria-invalid={errorField === "promo" || undefined} />
          </Field>
          <Field id={`${id}-note`} label={t("note")}>
            <Input id={`${id}-note`} name="note" maxLength={1000} />
          </Field>
        </div>
      </fieldset>

      <div className="space-y-3 rounded-card bg-surface p-6">
        <Row label={t("deliveryFee")}>
          {fee === null ? <span className="text-ink-2">{t("feeAfterWilaya")}</span> : fee === 0 ? t("free") : <Amount value={fee} locale={locale} />}
        </Row>
        <Row label={t("total")} strong>
          <Amount value={subtotal + (fee ?? 0)} locale={locale} />
        </Row>
        <p className="text-xs text-ink-2">{t("totalNote")}</p>
        <Button type="submit" size="lg" className="w-full" disabled={pending || !selected}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Banknote aria-hidden />}
          {pending ? t("placing") : t("place")}
        </Button>
      </div>
    </form>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-2">{hint}</p>
      ) : null}
    </div>
  );
}

function Row({ label, strong, children }: { label: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", strong && "border-t border-line pt-3 text-lg font-semibold")}>
      <span className={strong ? "" : "text-ink-2"}>{label}</span>
      <span>{children}</span>
    </div>
  );
}
