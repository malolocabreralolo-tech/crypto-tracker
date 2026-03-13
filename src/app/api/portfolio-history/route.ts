import { NextRequest, NextResponse } from "next/server";

const LLAMA_CHART_URL = "https://coins.llama.fi/chart";

const PERIOD_CONFIG: Record<string, { seconds: number; span: number }> = {
  "24H": { seconds: 86400, span: 300 },
  "1W": { seconds: 604800, span: 3600 },
  "1M": { seconds: 2592000, span: 14400 },
  "3M": { seconds: 7776000, span: 86400 },
  "1Y": { seconds: 31536000, span: 86400 },
};

// Map our chains to DeFiLlama identifiers
const CHAIN_TO_LLAMA: Record<string, string> = {
  ethereum: "ethereum",
  arbitrum: "arbitrum",
  optimism: "optimism",
  base: "base",
  polygon: "polygon",
  solana: "solana",
};

const NATIVE_ADDRESSES = new Set([
  "0x0000000000000000000000000000000000000000",
  "So11111111111111111111111111111111111111112",
]);

const NATIVE_TOKEN_KEYS: Record<string, string> = {
  ethereum: "coingecko:ethereum",
  arbitrum: "coingecko:ethereum",
  optimism: "coingecko:ethereum",
  base: "coingecko:ethereum",
  polygon: "coingecko:matic-network",
  solana: "coingecko:solana",
};

function buildCoinKey(chain: string, address: string): string {
  if (NATIVE_ADDRESSES.has(address)) {
    return NATIVE_TOKEN_KEYS[chain] || `coingecko:${chain}`;
  }
  const llamaChain = CHAIN_TO_LLAMA[chain] || chain;
  return `${llamaChain}:${address}`;
}

interface HoldingInput {
  chain: string;
  contractAddress: string;
  balanceFormatted: number;
  symbol: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const holdings: HoldingInput[] = body.holdings || [];
    const period: string = body.period || "1M";

    const config = PERIOD_CONFIG[period];
    if (!config || holdings.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Deduplicate coin keys and aggregate balances per key
    const coinBalances = new Map<string, { key: string; balance: number; symbol: string }>();
    for (const h of holdings) {
      if (h.chain === "hyperliquid") continue; // Skip HL spot (USDC is stable)
      const key = buildCoinKey(h.chain, h.contractAddress);
      const existing = coinBalances.get(key);
      if (existing) {
        existing.balance += h.balanceFormatted;
      } else {
        coinBalances.set(key, { key, balance: h.balanceFormatted, symbol: h.symbol });
      }
    }

    // Only fetch history for top holdings by current value (max 10 to avoid rate limits)
    const entries = [...coinBalances.values()]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);

    if (entries.length === 0) {
      return NextResponse.json({ history: [] });
    }

    const now = Math.floor(Date.now() / 1000);
    const start = now - config.seconds;

    // Fetch price histories in parallel
    const priceHistories = await Promise.all(
      entries.map(async (entry) => {
        try {
          const url = `${LLAMA_CHART_URL}/${entry.key}?start=${start}&span=${config.span}`;
          const res = await fetch(url);
          if (!res.ok) return { key: entry.key, prices: [] };
          const data = await res.json();
          const coinData = data?.coins?.[entry.key];
          if (!coinData?.prices) return { key: entry.key, prices: [] };
          return {
            key: entry.key,
            balance: entry.balance,
            prices: coinData.prices as { timestamp: number; price: number }[],
          };
        } catch {
          return { key: entry.key, prices: [] };
        }
      })
    );

    // Build a unified timeline
    // Collect all unique timestamps
    const allTimestamps = new Set<number>();
    for (const ph of priceHistories) {
      for (const p of ph.prices) {
        allTimestamps.add(p.timestamp);
      }
    }

    const sortedTimestamps = [...allTimestamps].sort((a, b) => a - b);

    if (sortedTimestamps.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // For each timestamp, calculate total portfolio value
    // Build price maps per coin
    const priceMaps = priceHistories.map((ph) => {
      const map = new Map<number, number>();
      for (const p of ph.prices) {
        map.set(p.timestamp, p.price);
      }
      return { ...ph, priceMap: map };
    });

    // Add USDC/stablecoin balances as constant value
    let stableValue = 0;
    for (const h of holdings) {
      const sym = h.symbol.toUpperCase();
      if (sym === "USDC" || sym === "USDT" || sym === "DAI" || sym === "USDB" || sym === "USDBC") {
        stableValue += h.balanceFormatted;
      }
    }

    const history = sortedTimestamps.map((ts) => {
      let totalValue = stableValue;
      for (const pm of priceMaps) {
        const price = pm.priceMap.get(ts);
        if (price !== undefined && pm.balance) {
          totalValue += pm.balance * price;
        }
      }
      return {
        timestamp: ts * 1000,
        totalValueUsd: totalValue,
      };
    });

    // Downsample if too many points (keep max 200)
    let result = history;
    if (result.length > 200) {
      const step = Math.ceil(result.length / 200);
      result = result.filter((_, i) => i % step === 0 || i === result.length - 1);
    }

    return NextResponse.json({ history: result });
  } catch (error) {
    console.error("[api/portfolio-history]", error);
    return NextResponse.json({ history: [] });
  }
}
