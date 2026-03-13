import { NextRequest, NextResponse } from "next/server";

const LLAMA_CHART_URL = "https://coins.llama.fi/chart";
const COINGECKO_API = "https://api.coingecko.com/api/v3";

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

// CoinGecko IDs for native tokens (used for 24H hourly data)
const COINGECKO_IDS: Record<string, string> = {
  "coingecko:ethereum": "ethereum",
  "coingecko:matic-network": "polygon-ecosystem-token", // MATIC renamed to POL
  "coingecko:solana": "solana",
};

// Well-known ERC20 → CoinGecko ID mappings
const TOKEN_TO_COINGECKO: Record<string, string> = {
  // WETH variants
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "ethereum",
  "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": "ethereum",
  "0x4200000000000000000000000000000000000006": "ethereum",
  "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619": "ethereum",
  // WBTC
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "bitcoin",
  // stETH / wstETH
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": "staked-ether",
  "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0": "wrapped-steth",
  // LINK
  "0x514910771af9ca656af840dff83e8264ecf986ca": "chainlink",
  // SHIB
  "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": "shiba-inu",
  // PEPE
  "0x6982508145454ce325ddbe47a25d4ec3d2311933": "pepe",
  // AAVE
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": "aave",
  // LDO
  "0x5a98fcbea516cf06857215779fd812ca3bef1b32": "lido-dao",
  // APE
  "0x4d224452801aced8b2f0aebe155379bb5d594381": "apecoin",
  // GMX
  "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a": "gmx",
  // ARB
  "0x912ce59144191c1204e64559fe8253a0e49e6548": "arbitrum",
};

function buildCoinKey(chain: string, address: string): string {
  if (NATIVE_ADDRESSES.has(address)) {
    return NATIVE_TOKEN_KEYS[chain] || `coingecko:${chain}`;
  }
  const llamaChain = CHAIN_TO_LLAMA[chain] || chain;
  return `${llamaChain}:${address}`;
}

function getCoinGeckoId(coinKey: string, address: string): string | null {
  // Check native token mapping
  if (COINGECKO_IDS[coinKey]) return COINGECKO_IDS[coinKey];
  // Check well-known token addresses
  const lower = address.toLowerCase();
  if (TOKEN_TO_COINGECKO[lower]) return TOKEN_TO_COINGECKO[lower];
  return null;
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

// Fetch 24H hourly data from CoinGecko (free API, ~5min intervals)
async function fetchCoinGecko24H(
  geckoId: string,
): Promise<PricePoint[]> {
  try {
    const url = `${COINGECKO_API}/coins/${geckoId}/market_chart?vs_currency=usd&days=1`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const prices: [number, number][] = data?.prices || [];
    return prices.map(([ts, price]) => ({
      timestamp: Math.floor(ts / 1000), // CoinGecko uses ms, convert to seconds
      price,
    }));
  } catch {
    return [];
  }
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
    const coinBalances = new Map<string, { key: string; balance: number; symbol: string; address: string }>();
    for (const h of holdings) {
      if (h.chain === "hyperliquid") continue; // Skip HL spot (USDC is stable)
      const key = buildCoinKey(h.chain, h.contractAddress);
      const existing = coinBalances.get(key);
      if (existing) {
        existing.balance += h.balanceFormatted;
      } else {
        coinBalances.set(key, { key, balance: h.balanceFormatted, symbol: h.symbol, address: h.contractAddress });
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
    const is24H = period === "24H";

    // Fetch price histories in parallel
    const priceHistories = await Promise.all(
      entries.map(async (entry) => {
        try {
          let prices: PricePoint[];

          if (is24H) {
            // Use CoinGecko for 24H (hourly/5min data vs DeFiLlama's daily)
            const geckoId = getCoinGeckoId(entry.key, entry.address);
            if (geckoId) {
              prices = await fetchCoinGecko24H(geckoId);
            } else {
              // Fallback to DeFiLlama for unknown tokens
              prices = await fetchChartChunked(entry.key, start, now);
            }
          } else {
            prices = await fetchChartChunked(entry.key, start, now);
          }

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

    // Start timeline only after all coins have data (avoid value jumps from missing coins)
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
