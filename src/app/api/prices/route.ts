import { NextRequest, NextResponse } from "next/server";
import { fetchPrices } from "@/lib/providers/defillama";

export async function POST(req: NextRequest) {
  try {
    const { tokens } = await req.json();

    if (!Array.isArray(tokens)) {
      return NextResponse.json({ error: "tokens array required" }, { status: 400 });
    }

    const prices = await fetchPrices(tokens);
    return NextResponse.json({ prices });
  } catch (error) {
    console.error("[api/prices]", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
