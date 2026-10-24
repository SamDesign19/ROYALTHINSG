"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { MAX_QUANTITY } from "@/features/cart/cookie";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("product");
  const button = "inline-flex size-11 items-center justify-center hover:bg-surface disabled:opacity-40";
  return (
    <div className={cn("inline-flex items-center rounded-control border border-line", className)} dir="ltr">
      <button type="button" className={cn(button, "rounded-s-control")} aria-label={t("decrease")} disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}>
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QUANTITY}
        value={value}
        disabled={disabled}
        aria-label={t("quantity")}
        onChange={(e) => {
          const n = Math.trunc(Number(e.target.value));
          if (n >= 1 && n <= MAX_QUANTITY) onChange(n);
        }}
        className="h-11 w-12 border-x border-line bg-transparent text-center text-sm tabular-nums [appearance:textfield] focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" className={cn(button, "rounded-e-control")} aria-label={t("increase")} disabled={disabled || value >= MAX_QUANTITY} onClick={() => onChange(value + 1)}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
