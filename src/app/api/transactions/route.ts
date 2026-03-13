import { NextRequest, NextResponse } from "next/server";
import { fetchEVMTransactions } from "@/lib/providers/alchemy";
import { fetchSolanaTransactions } from "@/lib/providers/helius";
import type { Chain } from "@/types";

const HELIUS_KEY = process.env.HELIUS_API_KEY || "";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const chainsParam = req.nextUrl.searchParams.get("chains") || "";

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const chains = chainsParam.split(",").filter(Boolean) as Chain[];
  const evmChains = chains.filter((c) => c !== "solana");
  const hasSolana = chains.includes("solana");

  try {
    const promises = [
      ...evmChains.map((chain) =>
        fetchEVMTransactions(address, chain)
          .then((txs) => txs.map((t) => ({ ...t, walletAddress: address })))
          .catch(() => [])
      ),
      ...(hasSolana && HELIUS_KEY
        ? [
            fetchSolanaTransactions(address, HELIUS_KEY)
              .then((txs) => txs.map((t) => ({ ...t, walletAddress: address })))
              .catch(() => []),
          ]
        : []),
    ];

    const results = await Promise.all(promises);
    const transactions = results.flat().sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("[api/transactions]", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
