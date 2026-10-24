"use client";

import { Loader2, Printer } from "lucide-react";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/features/admin/orders";
import { Notice } from "./ui";

type Action = (prev: ActionResult, form: FormData) => Promise<ActionResult>;

/** A form bound to a Server Action that returns {ok} / {error}, showing the result under the fields. */
export function ActionForm({
  action,
  children,
  submit,
  className,
  variant = "primary",
  confirm,
  resetOnSuccess,
}: {
  action: Action;
  children?: React.ReactNode;
  submit: string;
  className?: string;
  variant?: "primary" | "secondary" | "quiet";
  confirm?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const [, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) form.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={form}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        // Submitted through a transition rather than the `action` prop, so React does not clear the
        // fields afterwards: a failed save keeps what was typed.
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        start(() => formAction(data));
      }}
    >
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" variant={variant} size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {submit}
        </Button>
        {state?.error ? <Notice tone="danger">{state.error}</Notice> : state?.ok ? <Notice>{state.ok}</Notice> : null}
      </div>
    </form>
  );
}

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden /> Imprimer
    </Button>
  );
}
