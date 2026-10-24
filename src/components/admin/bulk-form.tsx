"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/features/admin/orders";
import { Notice } from "./ui";

type Action = (prev: ActionResult, form: FormData) => Promise<ActionResult>;

/** Wraps a table of `<input type="checkbox" name="id">` rows with select-all and bulk action buttons. */
export function BulkForm({ action, ops, children }: { action: Action; ops: { op: string; label: string; primary?: boolean }[]; children: React.ReactNode }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const [count, setCount] = useState(0);
  const [, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const boxes = () => [...(form.current?.querySelectorAll<HTMLInputElement>('input[name="id"]') ?? [])];
  const refresh = () => setCount(boxes().filter((b) => b.checked).length);

  return (
    <form
      ref={form}
      onChange={refresh}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        start(() => formAction(data));
      }}
    >
      <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-card border border-line bg-bg p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--ri-red)]"
            onChange={(e) => {
              for (const b of boxes()) b.checked = e.target.checked;
              refresh();
            }}
          />
          Tout sélectionner
        </label>
        <span className="text-sm text-ink-2">{count} sélectionné(s)</span>
        <span className="ms-auto flex flex-wrap gap-2">
          {ops.map((o) => (
            <Button key={o.op} type="submit" name="op" value={o.op} size="sm" variant={o.primary ? "primary" : "secondary"} disabled={pending || count === 0}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {o.label}
            </Button>
          ))}
        </span>
        {state?.error ? <Notice tone="danger">{state.error}</Notice> : state?.ok ? <Notice>{state.ok}</Notice> : null}
      </div>
      {children}
    </form>
  );
}
