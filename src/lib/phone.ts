/**
 * Same rules as normalize_dz_phone() in the database: 0XXXXXXXXX, +213XXXXXXXXX or 00213XXXXXXXXX
 * (spaces, dots, dashes and brackets ignored), returned as 0XXXXXXXXX, or null when invalid.
 */
export function normalizeDzPhone(input: string): string | null {
  const d = input.replace(/[\s.\-()]/g, "");
  if (/^\+213[1-9]\d{7,8}$/.test(d)) return "0" + d.slice(4);
  if (/^00213[1-9]\d{7,8}$/.test(d)) return "0" + d.slice(5);
  if (/^0[1-9]\d{7,8}$/.test(d)) return d;
  return null;
}
