import type { Chain, DeFiPosition } from '@/types';
import { ethCallRaw } from './rpc-helpers';

const AAVE_POOL_ADDRESSES: Partial<Record<Chain, string>> = {
  ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
};

const GET_USER_ACCOUNT_DATA_SELECTOR = '0xbf92857c';

function encodeGetUserAccountData(address: string): string {
  const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
  return `${GET_USER_ACCOUNT_DATA_SELECTOR}${paddedAddress}`;
}

function decodeUserAccountData(hex: string) {
  if (!hex || hex === '0x' || hex.length < 66) {
    return { totalCollateralBase: 0, totalDebtBase: 0 };
  }
  const data = hex.replace('0x', '');
  const totalCollateralBase = Number(BigInt('0x' + data.slice(0, 64))) / 1e8;
  const totalDebtBase = Number(BigInt('0x' + data.slice(64, 128))) / 1e8;
  return { totalCollateralBase, totalDebtBase };
}

async function fetchAaveForChain(
  address: string,
  chain: Chain,
): Promise<DeFiPosition | null> {
  const poolAddress = AAVE_POOL_ADDRESSES[chain];
  if (!poolAddress) return null;

  try {
    const result = await ethCallRaw(chain, poolAddress, encodeGetUserAccountData(address));
    const data = decodeUserAccountData(result);

    if (data.totalCollateralBase < 0.01) return null;

    const netValue = data.totalCollateralBase - data.totalDebtBase;
    const tokens: DeFiPosition['tokens'] = [];

    if (data.totalCollateralBase > 0) {
      tokens.push({ symbol: 'Collateral (USD)', amount: data.totalCollateralBase, valueUsd: data.totalCollateralBase });
    }
    if (data.totalDebtBase > 0) {
      tokens.push({ symbol: 'Debt (USD)', amount: -data.totalDebtBase, valueUsd: -data.totalDebtBase });
    }

    return {
      chain, protocol: 'aave', type: 'lending', tokens,
      totalValueUsd: netValue, walletAddress: address,
    };
  } catch (error) {
    console.error(`Failed to fetch Aave positions on ${chain}:`, error);
    return null;
  }
}

export async function fetchAavePositions(
  address: string,
  chain: Chain,
  _apiKey?: string
): Promise<DeFiPosition[]> {
  const result = await fetchAaveForChain(address, chain);
  return result ? [result] : [];
}

export async function fetchAavePositionsAllChains(
  address: string,
  _apiKey?: string
): Promise<DeFiPosition[]> {
  const chains = Object.keys(AAVE_POOL_ADDRESSES) as Chain[];
  const results = await Promise.all(chains.map((chain) => fetchAaveForChain(address, chain)));
  return results.filter((r): r is DeFiPosition => r !== null);
}
