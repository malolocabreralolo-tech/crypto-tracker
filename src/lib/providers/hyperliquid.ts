import type { TokenBalance, DeFiPosition } from '@/types';

const HL_API = 'https://api.hyperliquid.xyz/info';

interface HLPosition {
  position: {
    coin: string;
    szi: string;
    entryPx: string;
    positionValue: string;
    unrealizedPnl: string;
    returnOnEquity: string;
    leverage: { type: string; value: number; rawUsd: string };
    liquidationPx: string | null;
    marginUsed: string;
    maxLeverage: number;
    cumFunding: { allTime: string; sinceChange: string; sinceOpen: string };
  };
  type: string;
}

interface HLClearinghouseState {
  assetPositions: HLPosition[];
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  crossMarginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  withdrawable: string;
}

interface HLSpotBalance {
  coin: string;
  token: number;
  hold: string;
  total: string;
  entryNtl: string;
}

interface HLSpotAssetCtx {
  dayNtlVlm: string;
  markPx: string;
  midPx: string;
  prevDayPx: string;
}

interface HLSpotMeta {
  tokens: { name: string; szDecimals: number; weiDecimals: number; index: number; tokenId: string; fullName?: string }[];
  universe: { name: string; tokens: number[]; index: number }[];
}

async function hlPost(body: Record<string, unknown>): Promise<any> {
  const res = await fetch(HL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status}`);
  return res.json();
}

// Cache spot metadata + prices (refreshed per request batch)
let spotMetaCache: { meta: HLSpotMeta; ctxs: HLSpotAssetCtx[]; ts: number } | null = null;

async function getSpotMetaAndPrices(): Promise<{ meta: HLSpotMeta; ctxs: HLSpotAssetCtx[] }> {
  if (spotMetaCache && Date.now() - spotMetaCache.ts < 60_000) {
    return { meta: spotMetaCache.meta, ctxs: spotMetaCache.ctxs };
  }
  const result = await hlPost({ type: 'spotMetaAndAssetCtxs' });
  const meta = result[0] as HLSpotMeta;
  const ctxs = result[1] as HLSpotAssetCtx[];
  spotMetaCache = { meta, ctxs, ts: Date.now() };
  return { meta, ctxs };
}

export async function fetchHyperliquidBalances(
  address: string,
): Promise<TokenBalance[]> {
  try {
    const [spotState, { meta, ctxs }] = await Promise.all([
      hlPost({ type: 'spotClearinghouseState', user: address }) as Promise<{ balances: HLSpotBalance[] }>,
      getSpotMetaAndPrices(),
    ]);

    const balances: TokenBalance[] = [];

    for (const bal of spotState.balances || []) {
      const total = parseFloat(bal.total);
      if (total < 0.000001) continue;

      // Find the universe entry for this token to get the price
      const universeIdx = meta.universe.findIndex((u) =>
        u.tokens.includes(bal.token)
      );
      const markPx = universeIdx >= 0 ? parseFloat(ctxs[universeIdx]?.markPx || '0') : 0;

      // USDC is token 0, always $1
      const isUSDC = bal.coin === 'USDC' || bal.token === 0;
      const price = isUSDC ? 1 : markPx;
      const value = total * price;

      balances.push({
        chain: 'hyperliquid' as any,
        walletAddress: address,
        contractAddress: `hl-spot-${bal.token}`,
        symbol: bal.coin,
        name: meta.tokens.find((t) => t.index === bal.token)?.fullName || bal.coin,
        decimals: 0,
        balance: bal.total,
        balanceFormatted: total,
        priceUsd: price,
        valueUsd: value,
      });
    }

    return balances;
  } catch (error) {
    console.error(`[hyperliquid] Error fetching spot balances for ${address}:`, error);
    return [];
  }
}

export interface HyperliquidPerpPosition {
  coin: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  positionValue: number;
  unrealizedPnl: number;
  returnOnEquity: number;
  leverage: number;
  leverageType: string;
  liquidationPrice: number | null;
  marginUsed: number;
  funding: { allTime: number; sinceOpen: number };
  side: 'long' | 'short';
}

export interface HyperliquidAccountSummary {
  accountValue: number;
  totalMarginUsed: number;
  totalNotional: number;
  withdrawable: number;
  positions: HyperliquidPerpPosition[];
  spotBalances: TokenBalance[];
}

export async function fetchHyperliquidAccount(
  address: string,
): Promise<HyperliquidAccountSummary> {
  try {
    const [perpState, spotBalances] = await Promise.all([
      hlPost({ type: 'clearinghouseState', user: address }) as Promise<HLClearinghouseState>,
      fetchHyperliquidBalances(address),
    ]);

    const positions: HyperliquidPerpPosition[] = (perpState.assetPositions || []).map((ap) => {
      const p = ap.position;
      const size = parseFloat(p.szi);
      return {
        coin: p.coin,
        size: Math.abs(size),
        entryPrice: parseFloat(p.entryPx),
        markPrice: parseFloat(p.positionValue) / Math.abs(size) || 0,
        positionValue: parseFloat(p.positionValue),
        unrealizedPnl: parseFloat(p.unrealizedPnl),
        returnOnEquity: parseFloat(p.returnOnEquity),
        leverage: p.leverage.value,
        leverageType: p.leverage.type,
        liquidationPrice: p.liquidationPx ? parseFloat(p.liquidationPx) : null,
        marginUsed: parseFloat(p.marginUsed),
        funding: {
          allTime: parseFloat(p.cumFunding.allTime),
          sinceOpen: parseFloat(p.cumFunding.sinceOpen),
        },
        side: size >= 0 ? 'long' : 'short',
      };
    });

    return {
      accountValue: parseFloat(perpState.marginSummary.accountValue),
      totalMarginUsed: parseFloat(perpState.marginSummary.totalMarginUsed),
      totalNotional: parseFloat(perpState.marginSummary.totalNtlPos),
      withdrawable: parseFloat(perpState.withdrawable),
      positions,
      spotBalances,
    };
  } catch (error) {
    console.error(`[hyperliquid] Error fetching account for ${address}:`, error);
    return {
      accountValue: 0,
      totalMarginUsed: 0,
      totalNotional: 0,
      withdrawable: 0,
      positions: [],
      spotBalances: [],
    };
  }
}

// Convert perp positions to DeFiPosition format for the portfolio view
export function perpPositionsToDeFi(
  positions: HyperliquidPerpPosition[],
  walletAddress: string,
): DeFiPosition[] {
  return positions
    .filter((p) => p.positionValue > 0.01)
    .map((p) => ({
      chain: 'hyperliquid' as any,
      protocol: 'Hyperliquid',
      type: 'liquidity' as const, // closest match
      tokens: [
        {
          symbol: p.coin,
          amount: p.size,
          valueUsd: p.positionValue,
        },
      ],
      totalValueUsd: p.marginUsed + p.unrealizedPnl,
      apy: undefined,
      walletAddress,
      // Extra perp data
      _perp: p,
    }));
}
