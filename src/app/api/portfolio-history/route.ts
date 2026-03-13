import { NextRequest, NextResponse } from "next/server";

const LLAMA_CHART_URL = "https://coins.llama.fi/chart";

// span = number of data points (max 500 per DeFiLlama API)
const PERIOD_CONFIG: Record<string, { seconds: number; span: number }> = {
  "24H": { seconds: 86400, span: 96 },
  "1W": { seconds: 604800, span: 168 },
  "1M": { seconds: 2592000, span: 200 },
  "3M": { seconds: 7776000, span: 200 },
  "1Y": { seconds: 31536000, span: 365 },
  "2Y": { seconds: 63072000, span: 400 },
  "5Y": { seconds: 157680000, span: 500 },
  "ALL": { seconds: 315360000, span: 500 }, // ~10 years
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

    // For each coin, build a sorted price array for interpolation
    const coinSeries = priceHistories
      .filter((ph) => ph.prices.length > 0 && ph.balance)
      .map((ph) => ({
        balance: ph.balance as number,
        prices: [...ph.prices].sort((a, b) => a.timestamp - b.timestamp),
      }));

    // Add USDC/stablecoin balances as constant value
    let stableValue = 0;
    for (const h of holdings) {
      const sym = h.symbol.toUpperCase();
      if (sym === "USDC" || sym === "USDT" || sym === "DAI" || sym === "USDB" || sym === "USDBC") {
        stableValue += h.balanceFormatted;
      }
    }

    // Use timestamps from the coin with the most data points as the base timeline
    // This avoids jagged charts from merging different-frequency timestamps
    let baseTimestamps = sortedTimestamps;
    if (coinSeries.length > 0) {
      const longestSeries = coinSeries.reduce((a, b) =>
        a.prices.length >= b.prices.length ? a : b
      );
      baseTimestamps = longestSeries.prices.map((p) => p.timestamp);

      // Start timeline only after all coins have data (avoid jumps from missing coins)
      const latestFirstTs = Math.max(...coinSeries.map((c) => c.prices[0].timestamp));
      baseTimestamps = baseTimestamps.filter((ts) => ts >= latestFirstTs);
    }

    // Binary search: find last price at or before timestamp
    function getPrice(prices: { timestamp: number; price: number }[], ts: number): number | null {
      let lo = 0, hi = prices.length - 1;
      if (hi < 0 || ts < prices[0].timestamp) return null;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (prices[mid].timestamp <= ts) lo = mid;
        else hi = mid - 1;
      }
      return prices[lo].price;
    }

    const history = baseTimestamps.map((ts) => {
      let totalValue = stableValue;
      for (const coin of coinSeries) {
        const price = getPrice(coin.prices, ts);
        if (price !== null) {
          totalValue += coin.balance * price;
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
