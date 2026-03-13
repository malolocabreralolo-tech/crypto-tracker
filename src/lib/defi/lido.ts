import type { DeFiPosition } from '@/types';
import { ethCall } from './rpc-helpers';

const STETH_ADDRESS = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';
const WSTETH_ADDRESS = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';
const LIDO_APY = 0.035;

export async function fetchLidoPositions(
  address: string,
  _apiKey?: string
): Promise<DeFiPosition[]> {
  const positions: DeFiPosition[] = [];

  const [stethBalance, wstethBalance] = await Promise.all([
    ethCall('ethereum', STETH_ADDRESS, 'balanceOf', address),
    ethCall('ethereum', WSTETH_ADDRESS, 'balanceOf', address),
  ]);

  const stethFormatted = Number(stethBalance) / 1e18;
  const wstethFormatted = Number(wstethBalance) / 1e18;

  if (stethFormatted > 0.0001) {
    positions.push({
      chain: 'ethereum',
      protocol: 'lido',
      type: 'staking',
      tokens: [{ symbol: 'stETH', amount: stethFormatted, valueUsd: 0 }],
      totalValueUsd: 0,
      apy: LIDO_APY,
      walletAddress: address,
    });
  }

  if (wstethFormatted > 0.0001) {
    positions.push({
      chain: 'ethereum',
      protocol: 'lido',
      type: 'staking',
      tokens: [{ symbol: 'wstETH', amount: wstethFormatted, valueUsd: 0 }],
      totalValueUsd: 0,
      apy: LIDO_APY,
      walletAddress: address,
    });
  }

  return positions;
}
