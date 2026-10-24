import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/server/supabase";
import type { PrinterKind } from "@/features/catalog/types";

export type PrinterSeries = { id: string; slug: string; name: string };
export type PrinterSummary = { id: string; slug: string; model: string; kind: PrinterKind; series_id: string | null };
export type Printer = PrinterSummary & {
  brand: { id: string; slug: string; name: string };
  series: { id: string; name: string } | null;
};

function fail(what: string, error: { message: string }): never {
  throw new Error(`Failed to load ${what}: ${error.message}`);
}

/** Series and models of one printer brand, for the "Find your ink" selector. */
export async function getPrinterCatalog(brandSlug: string) {
  const client = createPublicClient();
  const { data: brand, error } = await client
    .from("brands")
    .select("id")
    .eq("slug", brandSlug)
    .eq("makes_printers", true)
    .maybeSingle();
  if (error) fail("printer brand", error);
  if (!brand) return null;
  const [series, printers] = await Promise.all([
    client.from("printer_series").select("id, slug, name").eq("brand_id", brand.id).order("sort_order").order("name"),
    client.from("printers").select("id, slug, model, kind, series_id").eq("brand_id", brand.id).order("model").limit(2000),
  ]);
  if (series.error) fail("printer series", series.error);
  if (printers.error) fail("printers", printers.error);
  return { series: (series.data ?? []) as PrinterSeries[], printers: (printers.data ?? []) as PrinterSummary[] };
}

export const getPrinter = cache(async (slug: string): Promise<Printer | null> => {
  const { data, error } = await createPublicClient()
    .from("printers")
    .select("id, slug, model, kind, series_id, brand:brands!inner(id, slug, name), series:printer_series(id, name)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail("printer", error);
  return (data as unknown as Printer) ?? null;
});
