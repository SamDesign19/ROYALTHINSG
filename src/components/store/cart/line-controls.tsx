"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { updateCartItem } from "@/features/cart/actions";
import { useRouter } from "@/i18n/navigation";
import { notifyCartChanged } from "./cart-store";
import { QuantityStepper } from "./quantity";

/** Quantity and remove controls for one cart line; the page re-renders with server-side prices. */
export function LineControls({ productId, quantity, name, canChange }: { productId: string; quantity: number; name: string; canChange: boolean }) {
  const t = useTranslations("cart");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setOptimistic] = useOptimistic(quantity);

  function update(next: number) {
    start(async () => {
      setOptimistic(next);
      await updateCartItem(productId, next);
      notifyCartChanged();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2" aria-busy={pending}>
      {canChange ? <QuantityStepper value={qty} onChange={update} disabled={pending} /> : null}
      <button
        type="button"
        onClick={() => update(0)}
        disabled={pending}
        aria-label={t("remove", { name })}
        className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface hover:text-ink disabled:opacity-50"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}
