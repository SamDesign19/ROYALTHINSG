"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/features/cart/actions";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { notifyCartChanged } from "./cart-store";
import { QuantityStepper } from "./quantity";

/** Product page: quantity + "Add to cart", then a link to the cart. */
export function AddToCart({ productId, available }: { productId: string; available: boolean }) {
  const t = useTranslations("product");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [pending, start] = useTransition();

  if (!available) {
    return <Button disabled className="w-full sm:w-auto">{t("unavailable")}</Button>;
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} onChange={setQty} disabled={pending} />
        <Button
          size="lg"
          className="flex-1 sm:flex-none"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await addToCart(productId, qty);
              if (res.ok) {
                notifyCartChanged();
                setAdded(true);
              }
            })
          }
        >
          {added ? <Check aria-hidden /> : <ShoppingBag aria-hidden />}
          {added ? t("added") : t("addToCart")}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm">
        {added ? (
          <Link href="/cart" className="font-medium underline underline-offset-4">{t("viewCart")}</Link>
        ) : null}
      </p>
    </div>
  );
}

/** Product card: small add button, shown on hover/focus on desktop and always on touch screens. */
export function AddToCartCompact({ productId, name, className }: { productId: string; name: string; className?: string }) {
  const t = useTranslations("product");
  const [added, setAdded] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${added ? t("added") : t("addToCart")}: ${name}`}
      onClick={() =>
        start(async () => {
          const res = await addToCart(productId, 1);
          if (res.ok) {
            notifyCartChanged();
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }
        })
      }
      className={cn(
        "relative z-10 inline-flex size-10 items-center justify-center rounded-full bg-ink text-bg shadow-1 transition-ri disabled:opacity-60",
        "[@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0",
        "[@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100",
        "[@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100",
        className,
      )}
    >
      {added ? <Check className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
    </button>
  );
}
