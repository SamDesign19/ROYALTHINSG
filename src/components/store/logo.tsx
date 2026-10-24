import { cn } from "@/lib/utils";

/** ROYAL INK wordmark: a lime drop on an ink tile and the name in ink. Always LTR. */
export function Logo({ className }: { className?: string }) {
  return (
    <span dir="ltr" className={cn("inline-flex items-center gap-2 font-semibold tracking-[-0.02em]", className)}>
      <svg viewBox="0 0 24 24" className="size-7 shrink-0" aria-hidden>
        <rect width="24" height="24" rx="6" fill="var(--ri-accent-ink)" />
        <path d="M12 3.5c3.2 3.8 5.8 7.1 5.8 10a5.8 5.8 0 0 1-11.6 0c0-2.9 2.6-6.2 5.8-10Z" fill="var(--ri-accent)" />
        <path d="M9.4 14.2a2.6 2.6 0 0 0 2.6 2.6" stroke="var(--ri-accent-ink)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
      <span className="text-[1.05rem] leading-none">
        ROYAL<span className="text-ink-2"> </span>INK
      </span>
    </span>
  );
}
