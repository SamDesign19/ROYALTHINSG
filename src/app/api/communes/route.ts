import { NextResponse, type NextRequest } from "next/server";
import { NO_CDN_CACHE } from "@/lib/http";
import { getCommunes } from "@/features/checkout/queries";

// Communes of one wilaya for the checkout form (empty until the official list is imported).
export async function GET(request: NextRequest) {
  const wilaya = Number(request.nextUrl.searchParams.get("wilaya"));
  if (!Number.isInteger(wilaya) || wilaya < 1 || wilaya > 99) return NextResponse.json({ error: "invalid_wilaya" }, { status: 400 });
  try {
    return NextResponse.json(await getCommunes(wilaya), { headers: NO_CDN_CACHE });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "communes_unavailable" }, { status: 502 });
  }
}
