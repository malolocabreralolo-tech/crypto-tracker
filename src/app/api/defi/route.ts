import { NextRequest, NextResponse } from "next/server";
import { fetchAllDeFiPositions } from "@/lib/defi";
import type { Chain } from "@/types";

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY || "";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const chainsParam = req.nextUrl.searchParams.get("chains") || "";

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const chains = chainsParam.split(",").filter(Boolean) as Chain[];

  try {
    const positions = await fetchAllDeFiPositions(
      address,
      chains,
      ALCHEMY_KEY || undefined
    );

    const withWallet = positions.map((p) => ({
      ...p,
      walletAddress: address,
    }));

    return NextResponse.json({ positions: withWallet });
  } catch (error) {
    console.error("[api/defi]", error);
    return NextResponse.json({ error: "Failed to fetch DeFi positions" }, { status: 500 });
  }
}
