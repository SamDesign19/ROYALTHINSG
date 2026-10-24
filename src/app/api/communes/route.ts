import { NextResponse, type NextRequest } from "next/server";
import { getCommunes } from "@/features/checkout/queries";

// Communes of one wilaya for the checkout form (empty until the official list is imported).
export async function GET(request: NextRequest) {
  const wilaya = Number(request.nextUrl.searchParams.get("wilaya"));
  if (!Number.isInteger(wilaya) || wilaya < 1 || wilaya > 99) return NextResponse.json({ error: "invalid_wilaya" }, { status: 400 });
  try {
    return NextResponse.json(await getCommunes(wilaya), { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "communes_unavailable" }, { status: 502 });
  }
}
