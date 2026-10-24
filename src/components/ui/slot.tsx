import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

/** Merges its props (and className) into its single child, like Radix Slot, for <Button asChild><Link/></Button>. */
export function Slot({ children, className, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  if (!isValidElement<{ className?: string }>(children)) return null;
  return cloneElement(children, { ...props, className: cn(className, children.props.className) });
}
