import { cn } from "@/lib/utils";

/** ROYAL INK wordmark: a drop-shaped mark in the accent red and the name in ink. Always LTR. */
export function Logo({ className }: { className?: string }) {
  return (
    <span dir="ltr" className={cn("inline-flex items-center gap-2 font-semibold tracking-[-0.02em]", className)}>
      <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden>
        <path d="M12 2.5c3.6 4.3 6.5 8 6.5 11.3a6.5 6.5 0 0 1-13 0C5.5 10.5 8.4 6.8 12 2.5Z" fill="var(--ri-red)" />
        <path d="M9 14.5a3 3 0 0 0 3 3" stroke="var(--ri-red-ink)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      <span className="text-[1.05rem] leading-none">
        ROYAL<span className="text-ink-2"> </span>INK
      </span>
    </span>
  );
}
