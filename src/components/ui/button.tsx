import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "./slot";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-11 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control px-5 text-sm font-medium " +
    "transition-ri active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:opacity-90",
        inverse: "bg-accent-ink text-accent hover:opacity-90",
        secondary: "border border-ink text-ink hover:opacity-80",
        quiet: "px-3 text-ink hover:opacity-70",
        surface: "bg-surface text-ink hover:opacity-80",
      },
      size: {
        md: "",
        sm: "min-h-9 px-3 text-sm",
        lg: "min-h-12 px-7 text-base",
        icon: "size-11 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
