import { NextResponse, type NextRequest } from "next/server";
import { NO_CDN_CACHE } from "@/lib/http";
import { getSuggestions } from "@/features/search/queries";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 2) return NextResponse.json({ products: [], printers: [], categories: [] });
  try {
    const data = await getSuggestions(q);
    return NextResponse.json(data, { headers: NO_CDN_CACHE });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "suggestions_unavailable" }, { status: 502 });
  }
}
