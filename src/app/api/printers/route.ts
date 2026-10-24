import { NextResponse, type NextRequest } from "next/server";
import { NO_CDN_CACHE } from "@/lib/http";
import { getPrinterCatalog } from "@/features/compatibility/queries";

// Series and printer models of one brand for the "Find your ink" selector.
export async function GET(request: NextRequest) {
  const brand = request.nextUrl.searchParams.get("brand") ?? "";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(brand)) return NextResponse.json({ error: "invalid_brand" }, { status: 400 });
  try {
    const data = await getPrinterCatalog(brand);
    if (!data) return NextResponse.json({ error: "unknown_brand" }, { status: 404 });
    return NextResponse.json(data, { headers: NO_CDN_CACHE });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "printers_unavailable" }, { status: 502 });
  }
}
