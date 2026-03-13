import type { Chain } from '@/types';

const LLAMA_PRICES_URL = 'https://coins.llama.fi/prices/current';
const LLAMA_CHART_URL = 'https://coins.llama.fi/chart';

// Map our Chain type to DeFiLlama chain identifiers
const CHAIN_TO_LLAMA: Record<Chain, string> = {
  ethereum: 'ethereum',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  base: 'base',
  polygon: 'polygon',
  solana: 'solana',
  hyperliquid: 'hyperliquid',
};

// Native token coingecko IDs for price lookup
const NATIVE_TOKEN_KEYS: Record<string, string> = {
  ethereum: 'coingecko:ethereum',
  arbitrum: 'coingecko:ethereum', // Arbitrum uses ETH
  optimism: 'coingecko:ethereum', // Optimism uses ETH
  base: 'coingecko:ethereum',     // Base uses ETH
  polygon: 'coingecko:matic-network',
  solana: 'coingecko:solana',
};

// Null/zero addresses used for native tokens
const NATIVE_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000',
  'So11111111111111111111111111111111111111112',
]);

function buildCoinKey(chain: string, address: string): string {
  // Handle native tokens
  if (NATIVE_ADDRESSES.has(address)) {
    return NATIVE_TOKEN_KEYS[chain] || `coingecko:${chain}`;
  }
  const llamaChain = CHAIN_TO_LLAMA[chain as Chain] || chain;
  return `${llamaChain}:${address}`;
}

export async function fetchPrices(
  tokens: { chain: string; address: string }[],
): Promise<Record<string, number>> {
  if (tokens.length === 0) return {};

  const prices: Record<string, number> = {};

  try {
    // Build coin keys and batch in groups of 100
    const coinEntries = tokens.map((t) => ({
      original: `${t.chain}:${t.address}`,
      key: buildCoinKey(t.chain, t.address),
    }));

    // Deduplicate keys
    const uniqueKeys = [...new Set(coinEntries.map((e) => e.key))];

    // Process in batches of 100
    for (let i = 0; i < uniqueKeys.length; i += 100) {
      const batch = uniqueKeys.slice(i, i + 100);
      const coinsParam = batch.join(',');

      const response = await fetch(`${LLAMA_PRICES_URL}/${coinsParam}`);

      if (!response.ok) {
        console.error(`[defillama] Price API error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      const coins = data?.coins || {};

      // Map results back to original chain:address keys
      for (const entry of coinEntries) {
        if (coins[entry.key]?.price != null) {
          prices[entry.original] = coins[entry.key].price;
        }
      }
    }

    return prices;
  } catch (error) {
    console.error('[defillama] Error fetching prices:', error);
    return prices;
  }
}

const PERIOD_TO_SECONDS: Record<string, number> = {
  '1d': 86400,
  '7d': 604800,
  '30d': 2592000,
  '90d': 7776000,
  '1y': 31536000,
};

// span = number of data points (max 500 per DeFiLlama API)
const PERIOD_TO_SPAN: Record<string, number> = {
  '1d': 96,
  '7d': 168,
  '30d': 200,
  '90d': 200,
  '1y': 365,
};

export async function fetchPriceHistory(
  chain: string,
  address: string,
  period: '1d' | '7d' | '30d' | '90d' | '1y',
): Promise<{ timestamp: number; price: number }[]> {
  try {
    const coinKey = buildCoinKey(chain, address);
    const now = Math.floor(Date.now() / 1000);
    const start = now - (PERIOD_TO_SECONDS[period] || 86400);
    const span = PERIOD_TO_SPAN[period] || 3600;

    const url = `${LLAMA_CHART_URL}/${coinKey}?start=${start}&span=${span}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[defillama] Chart API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const coins = data?.coins || {};
    const coinData = coins[coinKey];

    if (!coinData?.prices) return [];

    return coinData.prices.map((p: { timestamp: number; price: number }) => ({
      timestamp: p.timestamp * 1000, // Convert to ms
      price: p.price,
    }));
  } catch (error) {
    console.error(`[defillama] Error fetching price history for ${chain}:${address}:`, error);
    return [];
  }
}

/**
 * Get the DeFiLlama chain name for a given Chain
 */
export function getLlamaChainName(chain: Chain): string {
  return CHAIN_TO_LLAMA[chain];
}
