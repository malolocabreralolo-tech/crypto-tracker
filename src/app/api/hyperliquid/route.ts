import { NextRequest, NextResponse } from "next/server";
import { fetchHyperliquidAccount } from "@/lib/providers/hyperliquid";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  try {
    const account = await fetchHyperliquidAccount(address);
    return NextResponse.json(account);
  } catch (error) {
    console.error("[api/hyperliquid]", error);
    return NextResponse.json({ error: "Failed to fetch Hyperliquid data" }, { status: 500 });
  }
}
