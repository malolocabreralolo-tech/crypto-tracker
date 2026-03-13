import { Alchemy, Network } from 'alchemy-sdk';
import type { DeFiPosition } from '@/types';

const STETH_ADDRESS = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';
const WSTETH_ADDRESS = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';

const LIDO_APY = 0.035; // ~3.5% approximate APY

// ERC-20 balanceOf(address) selector
const BALANCE_OF_SELECTOR = '0x70a08231';

function encodeBalanceOf(address: string): string {
  const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
  return `${BALANCE_OF_SELECTOR}${paddedAddress}`;
}

function decodeUint256(hex: string): bigint {
  if (!hex || hex === '0x' || hex === '0x0') return BigInt(0);
  return BigInt(hex);
}

async function getTokenBalance(
  alchemy: Alchemy,
  tokenAddress: string,
  walletAddress: string
): Promise<bigint> {
  try {
    const result = await alchemy.core.call({
      to: tokenAddress,
      data: encodeBalanceOf(walletAddress),
    });
    return decodeUint256(result);
  } catch (error) {
    console.error(`Failed to fetch balance for token ${tokenAddress}:`, error);
    return BigInt(0);
  }
}

export async function fetchLidoPositions(
  address: string,
  apiKey?: string
): Promise<DeFiPosition[]> {
  const alchemy = new Alchemy({
    apiKey: apiKey || 'demo',
    network: Network.ETH_MAINNET,
  });

  const positions: DeFiPosition[] = [];

  const [stethBalance, wstethBalance] = await Promise.all([
    getTokenBalance(alchemy, STETH_ADDRESS, address),
    getTokenBalance(alchemy, WSTETH_ADDRESS, address),
  ]);

  const stethFormatted = Number(stethBalance) / 1e18;
  const wstethFormatted = Number(wstethBalance) / 1e18;

  // Fetch ETH price from Alchemy to estimate USD values
  let ethPriceUsd = 0;
  try {
    // Use a rough estimate or fetch from the calling context
    // For now, we set 0 and let the aggregator layer fill in prices
    // since DeFiLlama is the price source in this app
    ethPriceUsd = 0;
  } catch {
    // price will be 0, filled in by aggregator
  }

  if (stethFormatted > 0.0001) {
    positions.push({
      chain: 'ethereum',
      protocol: 'lido',
      type: 'staking',
      tokens: [
        {
          symbol: 'stETH',
          amount: stethFormatted,
          valueUsd: stethFormatted * ethPriceUsd,
        },
      ],
      totalValueUsd: stethFormatted * ethPriceUsd,
      apy: LIDO_APY,
      walletAddress: address,
    });
  }

  if (wstethFormatted > 0.0001) {
    // wstETH trades at a premium over stETH due to accumulated rewards
    // approximate 1 wstETH ~ 1.18 stETH (this ratio grows over time)
    const wstethRatio = 1.18;
    const ethEquivalent = wstethFormatted * wstethRatio;

    positions.push({
      chain: 'ethereum',
      protocol: 'lido',
      type: 'staking',
      tokens: [
        {
          symbol: 'wstETH',
          amount: wstethFormatted,
          valueUsd: ethEquivalent * ethPriceUsd,
        },
      ],
      totalValueUsd: ethEquivalent * ethPriceUsd,
      apy: LIDO_APY,
      walletAddress: address,
    });
  }

  return positions;
}
