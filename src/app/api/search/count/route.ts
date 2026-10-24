import { NextResponse, type NextRequest } from "next/server";
import { NO_CDN_CACHE } from "@/lib/http";
import { getPrinter } from "@/features/compatibility/queries";
import { parseSearchParams, type RawSearchParams } from "@/features/search/params";
import { searchProducts } from "@/features/search/queries";

// Result count for the mobile filter sheet ("Show 12 results").
export async function GET(request: NextRequest) {
  const raw: RawSearchParams = {};
  for (const key of new Set(request.nextUrl.searchParams.keys())) raw[key] = request.nextUrl.searchParams.getAll(key);
  const filters = { ...parseSearchParams(raw), page: 1 };
  try {
    const printer = filters.printer ? await getPrinter(filters.printer) : null;
    const { total } = await searchProducts(filters, { printerId: printer?.id, limit: 1 });
    return NextResponse.json({ total }, { headers: NO_CDN_CACHE });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "count_unavailable" }, { status: 502 });
  }
}
