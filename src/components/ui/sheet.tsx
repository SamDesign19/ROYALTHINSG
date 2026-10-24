"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

type Side = "bottom" | "start" | "top";

const sides: Record<Side, string> = {
  bottom: "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-media data-[state=closed]:translate-y-full",
  start: "inset-y-0 start-0 h-dvh w-[min(24rem,90vw)] data-[state=closed]:-translate-x-full rtl:data-[state=closed]:translate-x-full",
  top: "inset-x-0 top-0 max-h-[90dvh] rounded-b-media data-[state=closed]:-translate-y-full",
};

export function SheetContent({
  side = "bottom",
  title,
  description,
  closeLabel,
  className,
  children,
  ...props
}: Dialog.DialogContentProps & { side?: Side; title: string; description?: string; closeLabel: string }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 transition-opacity duration-[var(--ri-base)] data-[state=closed]:opacity-0 data-[state=open]:animate-[ri-fade-in_var(--ri-base)_var(--ri-ease)]" />
      <Dialog.Content
        className={cn(
          "fixed z-50 flex flex-col bg-bg shadow-2 outline-none transition-transform duration-[var(--ri-base)] ease-ri",
          "data-[state=open]:animate-[ri-sheet-in_var(--ri-base)_var(--ri-ease)]",
          sides[side],
          className,
        )}
        data-side={side}
        {...props}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
          <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
          <Dialog.Close className="-me-2 inline-flex size-11 items-center justify-center rounded-control hover:bg-surface" aria-label={closeLabel}>
            <X className="size-5" aria-hidden />
          </Dialog.Close>
        </div>
        {description ? <Dialog.Description className="sr-only">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
