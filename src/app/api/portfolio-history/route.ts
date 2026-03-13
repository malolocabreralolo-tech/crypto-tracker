import { NextRequest, NextResponse } from "next/server";

const LLAMA_CHART_URL = "https://coins.llama.fi/chart";

// Each chunk fetches ~1 year of data with span=365 (~1 point/day)
const ONE_YEAR = 31536000;

const PERIOD_CONFIG: Record<string, { seconds: number }> = {
  "24H": { seconds: 86400 },
  "1W": { seconds: 604800 },
  "1M": { seconds: 2592000 },
  "3M": { seconds: 7776000 },
  "1Y": { seconds: ONE_YEAR },
  "2Y": { seconds: ONE_YEAR * 2 },
  "5Y": { seconds: ONE_YEAR * 5 },
};

// Span per chunk — DeFiLlama returns exactly this many points per request
function getSpanForRange(rangeSeconds: number): number {
  if (rangeSeconds <= 86400) return 96;       // 24H: ~15min intervals
  if (rangeSeconds <= 604800) return 168;     // 1W: ~1h intervals
  if (rangeSeconds <= 2592000) return 200;    // 1M
  if (rangeSeconds <= ONE_YEAR) return 365;   // up to 1Y: daily
  return 365; // chunk size for multi-year
}

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

interface PricePoint {
  timestamp: number;
  price: number;
}

async function fetchChartChunked(
  coinKey: string,
  startTs: number,
  endTs: number,
): Promise<PricePoint[]> {
  const totalRange = endTs - startTs;

  // For ranges <= 1 year, single request
  if (totalRange <= ONE_YEAR) {
    const span = getSpanForRange(totalRange);
    const url = `${LLAMA_CHART_URL}/${coinKey}?start=${startTs}&span=${span}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.coins?.[coinKey]?.prices || [];
  }

  // For multi-year ranges, fetch in 1-year chunks
  const allPrices: PricePoint[] = [];
  const seen = new Set<number>();
  let chunkStart = startTs;

  while (chunkStart < endTs) {
    const chunkEnd = Math.min(chunkStart + ONE_YEAR, endTs);
    const span = 365;
    const url = `${LLAMA_CHART_URL}/${coinKey}?start=${chunkStart}&span=${span}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const prices: PricePoint[] = data?.coins?.[coinKey]?.prices || [];
        for (const p of prices) {
          if (!seen.has(p.timestamp)) {
            seen.add(p.timestamp);
            allPrices.push(p);
          }
        }
      }
    } catch {
      // skip failed chunk
    }
    chunkStart = chunkEnd;
  }

  return allPrices.sort((a, b) => a.timestamp - b.timestamp);
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

    // Fetch price histories in parallel (with chunking for multi-year)
    const priceHistories = await Promise.all(
      entries.map(async (entry) => {
        try {
          const prices = await fetchChartChunked(entry.key, start, now);
          return {
            key: entry.key,
            balance: entry.balance,
            prices,
          };
        } catch {
          return { key: entry.key, prices: [] as PricePoint[] };
        }
      })
    );

    // For each coin, build a sorted price array for interpolation
    const coinSeries = priceHistories
      .filter((ph) => ph.prices.length > 0 && ph.balance)
      .map((ph) => ({
        balance: ph.balance as number,
        prices: [...ph.prices].sort((a, b) => a.timestamp - b.timestamp),
      }));

    if (coinSeries.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Add USDC/stablecoin balances as constant value
    let stableValue = 0;
    for (const h of holdings) {
      const sym = h.symbol.toUpperCase();
      if (sym === "USDC" || sym === "USDT" || sym === "DAI" || sym === "USDB" || sym === "USDBC") {
        stableValue += h.balanceFormatted;
      }
    }

    // Use timestamps from the coin with the most data points as the base timeline
    const longestSeries = coinSeries.reduce((a, b) =>
      a.prices.length >= b.prices.length ? a : b
    );
    let baseTimestamps = longestSeries.prices.map((p) => p.timestamp);

    // Start timeline only after all coins have data (avoid jumps from missing coins)
    const latestFirstTs = Math.max(...coinSeries.map((c) => c.prices[0].timestamp));
    baseTimestamps = baseTimestamps.filter((ts) => ts >= latestFirstTs);

    // Binary search: find last price at or before timestamp
    function getPrice(prices: PricePoint[], ts: number): number | null {
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

    // Downsample if too many points (keep max 300)
    let result = history;
    if (result.length > 300) {
      const step = Math.ceil(result.length / 300);
      result = result.filter((_, i) => i % step === 0 || i === result.length - 1);
    }

    return NextResponse.json({ history: result });
  } catch (error) {
    console.error("[api/portfolio-history]", error);
    return NextResponse.json({ history: [] });
  }
}
