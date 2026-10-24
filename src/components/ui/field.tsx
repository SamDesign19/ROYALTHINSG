import { cn } from "@/lib/utils";

const control =
  "min-h-11 w-full rounded-control border border-line bg-bg px-3 text-base text-ink placeholder:text-ink-2 " +
  "focus-visible:border-ink focus-visible:outline-none disabled:opacity-50 sm:text-sm";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(control, "appearance-none bg-[length:16px] pe-9", "select-chevron", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...props} />;
}

export function Checkbox({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return <input type="checkbox" className={cn("size-4 shrink-0 rounded accent-[var(--ri-red)]", className)} {...props} />;
}
