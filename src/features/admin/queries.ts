import "server-only";
import { pick, type Localized } from "@/lib/localized";
import { createSessionClient } from "@/server/supabase";

/** Category tree flattened for <select>s (staff see inactive categories too). */
export async function categoryOptions() {
  const db = await createSessionClient();
  const { data } = await db.from("categories").select("id, parent_id, name, sort_order, is_active").order("sort_order");
  const rows = (data ?? []) as { id: string; parent_id: string | null; name: Localized; is_active: boolean }[];
  const out: { id: string; name: string; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of rows.filter((r) => r.parent_id === parent)) {
      out.push({ id: c.id, name: pick(c.name, "fr") + (c.is_active ? "" : " (masquée)"), depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export async function brandOptions() {
  const db = await createSessionClient();
  const { data } = await db.from("brands").select("id, name, makes_printers").order("name");
  return (data ?? []) as { id: string; name: string; makes_printers: boolean }[];
}
