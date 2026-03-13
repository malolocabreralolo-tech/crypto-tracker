import { NextRequest, NextResponse } from "next/server";
import { fetchEVMAllChainBalances } from "@/lib/providers/alchemy";
import { fetchSolanaBalances } from "@/lib/providers/helius";
import { fetchHyperliquidBalances } from "@/lib/providers/hyperliquid";
import type { Chain } from "@/types";

const HELIUS_KEY = process.env.HELIUS_API_KEY || "";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const chainsParam = req.nextUrl.searchParams.get("chains") || "";

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const chains = chainsParam.split(",").filter(Boolean) as Chain[];
  const evmChains = chains.filter((c) => c !== "solana" && c !== "hyperliquid");
  const hasSolana = chains.includes("solana");
  const hasHyperliquid = chains.includes("hyperliquid");

  try {
    const results = await Promise.all([
      evmChains.length > 0
        ? fetchEVMAllChainBalances(address, evmChains)
        : Promise.resolve([]),
      hasSolana && HELIUS_KEY
        ? fetchSolanaBalances(address, HELIUS_KEY)
        : Promise.resolve([]),
      hasHyperliquid
        ? fetchHyperliquidBalances(address)
        : Promise.resolve([]),
    ]);

    const balances = results.flat().map((b) => ({
      ...b,
      walletAddress: address,
    }));

    return NextResponse.json({ balances });
  } catch (error) {
    console.error("[api/balances]", error);
    return NextResponse.json({ error: "Failed to fetch balances" }, { status: 500 });
  }
}
