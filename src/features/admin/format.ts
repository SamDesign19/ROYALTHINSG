// French formatting for the back office (Algiers time).
const money = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Algiers" });
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Africa/Algiers" });

export const da = (n: number | string | null | undefined) => (n === null || n === undefined ? "—" : `${money.format(Number(n)).replace(/\s/g, " ")} DA`);
export const dateTime = (d: string | Date) => date.format(new Date(d));
export const dateOnly = (d: string | Date) => day.format(new Date(d));

/** Calendar dates in Algiers time: today, and `n` days ago (YYYY-MM-DD). */
export function algiersDay(daysAgo = 0): string {
  return new Date(Date.now() - daysAgo * 864e5).toLocaleDateString("en-CA", { timeZone: "Africa/Algiers" });
}
