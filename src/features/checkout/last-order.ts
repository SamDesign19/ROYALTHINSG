import { z } from "zod";

// Short-lived httpOnly cookie that lets the confirmation page show the order a guest just placed
// (guests cannot read the orders table; RLS only lets signed-in owners and staff do that).
export const LAST_ORDER_COOKIE = "ri_last_order";

const schema = z.object({
  number: z.string().max(40),
  total: z.number(),
  phone: z.string().max(20),
  method: z.enum(["home", "pickup"]),
});
export type LastOrder = z.infer<typeof schema>;

export function parseLastOrder(value: string | undefined): LastOrder | null {
  if (!value) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
