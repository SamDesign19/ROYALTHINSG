import { cn } from "@/lib/utils";

// Small building blocks shared by the back-office pages.

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, actions, className, children }: { title?: string; actions?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-card border border-line bg-bg p-5", className)}>
      {title || actions ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-base font-semibold">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-card border border-line bg-bg", className)}>
      <table className="w-full text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-start [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-ink-2 [&_thead]:border-b [&_thead]:border-line [&_thead]:bg-surface [&_tbody_tr]:border-b [&_tbody_tr]:border-line [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}

const TONES = {
  neutral: "bg-surface text-ink-2",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-accent/10 text-accent",
  ink: "bg-ink text-bg",
} as const;

export function Pill({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone])}>{children}</span>;
}

export const ORDER_STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  pending: { label: "Nouvelle", tone: "warning" },
  confirmed: { label: "Confirmée", tone: "ink" },
  processing: { label: "En préparation", tone: "neutral" },
  shipped: { label: "Expédiée", tone: "neutral" },
  delivered: { label: "Livrée", tone: "success" },
  cancelled: { label: "Annulée", tone: "danger" },
  returned: { label: "Retournée", tone: "danger" },
};

export const PRODUCT_STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  draft: { label: "Brouillon", tone: "warning" },
  active: { label: "En ligne", tone: "success" },
  archived: { label: "Archivé", tone: "neutral" },
};

export function Notice({ tone = "success", children }: { tone?: "success" | "danger"; children: React.ReactNode }) {
  return (
    <p role={tone === "danger" ? "alert" : "status"} className={cn("rounded-control px-3 py-2 text-sm font-medium", tone === "danger" ? "bg-accent/10 text-accent" : "bg-success/10 text-success")}>
      {children}
    </p>
  );
}

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-ink-2">Page {page} / {pageCount}</span>
      <span className="flex gap-2">
        {page > 1 ? <a href={href(page - 1)} className="rounded-control border border-line bg-bg px-3 py-1.5 hover:border-ink">Précédent</a> : null}
        {page < pageCount ? <a href={href(page + 1)} className="rounded-control border border-line bg-bg px-3 py-1.5 hover:border-ink">Suivant</a> : null}
      </span>
    </nav>
  );
}
