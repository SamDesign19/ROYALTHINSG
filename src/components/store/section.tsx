import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function Section({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("py-12 md:py-16", className)} {...props}>
      <div className="container-ri">{children}</div>
    </section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel,
  id,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
      <div className="space-y-2">
        <h2 id={id} className="display text-2xl md:text-3xl">{title}</h2>
        {subtitle ? <p className="max-w-[68ch] text-ink-2">{subtitle}</p> : null}
      </div>
      {href && linkLabel ? (
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-medium hover:opacity-70">
          {linkLabel}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
