"use client";

import { BadgePercent, Boxes, ClipboardList, ExternalLink, Gauge, Layers, LogOut, Package, Printer, Truck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/store/logo";
import { signOut } from "@/features/admin/auth-actions";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: Gauge, exact: true },
  { href: "/admin/orders", label: "Commandes", icon: ClipboardList },
  { href: "/admin/products", label: "Produits", icon: Package },
  { href: "/admin/inventory", label: "Stock", icon: Boxes },
  { href: "/admin/printers", label: "Imprimantes & compatibilité", icon: Printer },
  { href: "/admin/catalog", label: "Catégories & marques", icon: Layers },
  { href: "/admin/delivery", label: "Livraison", icon: Truck },
  { href: "/admin/promos", label: "Codes promo", icon: BadgePercent },
];

export function Sidebar({ email, role }: { email: string | null; role: string }) {
  const path = usePathname();
  return (
    <aside className="flex w-full flex-col border-b border-line bg-bg print:hidden md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:border-b-0 md:border-e">
      <div className="flex items-center justify-between gap-2 px-5 py-4">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo />
        </Link>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-2">Admin</span>
      </div>
      <nav aria-label="Administration" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 shrink-0 items-center gap-3 rounded-control px-3 text-sm",
                active ? "bg-ink font-medium text-bg" : "text-ink-2 hover:bg-surface hover:text-ink",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
        <a href="/" target="_blank" rel="noreferrer" className="flex min-h-10 shrink-0 items-center gap-3 rounded-control px-3 text-sm text-ink-2 hover:bg-surface hover:text-ink">
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          Voir la boutique
        </a>
      </nav>
      <div className="hidden border-t border-line p-4 md:block">
        <p className="truncate text-sm font-medium">{email}</p>
        <p className="mb-3 text-xs text-ink-2">{role === "admin" ? "Administrateur" : "Équipe"}</p>
        <form action={signOut}>
          <button type="submit" className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
            <LogOut className="size-4" aria-hidden /> Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}


