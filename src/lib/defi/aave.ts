import { Alchemy, Network } from 'alchemy-sdk';
import type { Chain, DeFiPosition } from '@/types';
import { CHAIN_CONFIG } from '@/lib/chains/config';

// Aave v3 Pool contract addresses per chain
const AAVE_POOL_ADDRESSES: Partial<Record<Chain, string>> = {
  ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
};

// getUserAccountData(address) returns:
// (totalCollateralBase, totalDebtBase, availableBorrowsBase, currentLiquidationThreshold, ltv, healthFactor)
// All base values are in USD with 8 decimals
const GET_USER_ACCOUNT_DATA_SELECTOR = '0xbf92857c';

function encodeGetUserAccountData(address: string): string {
  const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
  return `${GET_USER_ACCOUNT_DATA_SELECTOR}${paddedAddress}`;
}

function decodeUserAccountData(hex: string): {
  totalCollateralBase: number;
  totalDebtBase: number;
  availableBorrowsBase: number;
  healthFactor: number;
} {
  if (!hex || hex === '0x' || hex.length < 66) {
    return { totalCollateralBase: 0, totalDebtBase: 0, availableBorrowsBase: 0, healthFactor: 0 };
  }

  // Remove 0x prefix, each value is 32 bytes (64 hex chars)
  const data = hex.replace('0x', '');

  const totalCollateralBase = Number(BigInt('0x' + data.slice(0, 64))) / 1e8;
  const totalDebtBase = Number(BigInt('0x' + data.slice(64, 128))) / 1e8;
  const availableBorrowsBase = Number(BigInt('0x' + data.slice(128, 192))) / 1e8;
  // slots 3 and 4 are liquidation threshold and ltv
  const healthFactor = Number(BigInt('0x' + data.slice(320, 384))) / 1e18;

  return { totalCollateralBase, totalDebtBase, availableBorrowsBase, healthFactor };
}

function getAlchemyNetwork(chain: Chain): Network | null {
  return CHAIN_CONFIG[chain]?.alchemyNetwork ?? null;
}

async function fetchAaveForChain(
  address: string,
  chain: Chain,
  apiKey?: string
): Promise<DeFiPosition | null> {
  const poolAddress = AAVE_POOL_ADDRESSES[chain];
  if (!poolAddress) return null;

  const network = getAlchemyNetwork(chain);
  if (!network) return null;

  const alchemy = new Alchemy({
    apiKey: apiKey || 'demo',
    network,
  });

  try {
    const result = await alchemy.core.call({
      to: poolAddress,
      data: encodeGetUserAccountData(address),
    });

    const data = decodeUserAccountData(result);

    // Skip if no collateral deposited
    if (data.totalCollateralBase < 0.01) return null;

    const netValue = data.totalCollateralBase - data.totalDebtBase;

    const tokens: DeFiPosition['tokens'] = [];

    if (data.totalCollateralBase > 0) {
      tokens.push({
        symbol: 'Collateral (USD)',
        amount: data.totalCollateralBase,
        valueUsd: data.totalCollateralBase,
      });
    }

    if (data.totalDebtBase > 0) {
      tokens.push({
        symbol: 'Debt (USD)',
        amount: -data.totalDebtBase,
        valueUsd: -data.totalDebtBase,
      });
    }

    return {
      chain,
      protocol: 'aave',
      type: 'lending',
      tokens,
      totalValueUsd: netValue,
      apy: undefined, // Aave APY varies per token, would need per-reserve queries
      walletAddress: address,
    };
  } catch (error) {
    console.error(`Failed to fetch Aave positions on ${chain}:`, error);
    return null;
  }
}

export async function fetchAavePositions(
  address: string,
  chain: Chain,
  apiKey?: string
): Promise<DeFiPosition[]> {
  // If a specific chain is requested, only fetch that one
  const result = await fetchAaveForChain(address, chain, apiKey);
  return result ? [result] : [];
}

/** Fetch Aave positions across all supported chains */
export async function fetchAavePositionsAllChains(
  address: string,
  apiKey?: string
): Promise<DeFiPosition[]> {
  const chains = Object.keys(AAVE_POOL_ADDRESSES) as Chain[];

  const results = await Promise.all(
    chains.map((chain) => fetchAaveForChain(address, chain, apiKey))
  );

  return results.filter((r): r is DeFiPosition => r !== null);
}
