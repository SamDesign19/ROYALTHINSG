"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/** Copies one value into every input whose name starts with `prefix` (e.g. the home fee of all wilayas). */
export function FillColumn({ prefix, label }: { prefix: string; label: string }) {
  const [value, setValue] = useState("");
  return (
    <span className="inline-flex items-center gap-1">
      <Input value={value} onChange={(e) => setValue(e.target.value)} type="number" min={0} placeholder={label} aria-label={label} className="min-h-9 w-28" />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={(e) => {
          const form = (e.currentTarget as HTMLElement).closest("form");
          form?.querySelectorAll<HTMLInputElement>(`input[name^="${prefix}"]`).forEach((i) => (i.value = value));
        }}
      >
        Appliquer à toutes
      </Button>
    </span>
  );
}
