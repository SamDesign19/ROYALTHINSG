"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartCount } from "./cart-store";

export function CartButton() {
  const t = useTranslations("header");
  const count = useCartCount();
  return (
    <Link
      href="/cart"
      aria-label={t("cartCount", { count })}
      className="relative inline-flex size-11 items-center justify-center rounded-control hover:bg-surface"
    >
      <ShoppingBag className="size-5" aria-hidden />
      {count > 0 ? (
        <span className="absolute end-1 top-1 min-w-5 rounded-full bg-accent px-1 text-center text-[11px] font-semibold leading-5 text-accent-ink tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
