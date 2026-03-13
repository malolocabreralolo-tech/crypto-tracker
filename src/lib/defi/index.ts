import type { Chain, DeFiPosition } from '@/types';
import { fetchLidoPositions } from './lido';
import { fetchAavePositions } from './aave';
import { fetchUniswapPositions } from './uniswap';
import { fetchRaydiumPositions } from './raydium';

const EVM_CHAINS: Chain[] = ['ethereum', 'arbitrum', 'optimism', 'base', 'polygon'];

interface ProtocolResult {
  protocol: string;
  positions: DeFiPosition[];
}

async function safeCall(
  protocol: string,
  fn: () => Promise<DeFiPosition[]>
): Promise<ProtocolResult> {
  try {
    const positions = await fn();
    return { protocol, positions };
  } catch (error) {
    console.error(`DeFi adapter error [${protocol}]:`, error);
    return { protocol, positions: [] };
  }
}

export async function fetchAllDeFiPositions(
  address: string,
  chains: Chain[],
  apiKey?: string
): Promise<DeFiPosition[]> {
  const evmChains = chains.filter((c) => EVM_CHAINS.includes(c));
  const hasSolana = chains.includes('solana');

  const promises: Promise<ProtocolResult>[] = [];

  // Lido: Ethereum only
  if (evmChains.includes('ethereum')) {
    promises.push(safeCall('lido', () => fetchLidoPositions(address, apiKey)));
  }

  // Aave: per EVM chain
  for (const chain of evmChains) {
    promises.push(safeCall(`aave-${chain}`, () => fetchAavePositions(address, chain, apiKey)));
  }

  // Uniswap: per EVM chain
  for (const chain of evmChains) {
    promises.push(
      safeCall(`uniswap-${chain}`, () => fetchUniswapPositions(address, chain, apiKey))
    );
  }

  // Raydium: Solana only
  if (hasSolana) {
    promises.push(safeCall('raydium', () => fetchRaydiumPositions(address, apiKey)));
  }

  const results = await Promise.all(promises);

  const allPositions = results.flatMap((r) => r.positions);

  // Sort by totalValueUsd descending
  allPositions.sort((a, b) => b.totalValueUsd - a.totalValueUsd);

  return allPositions;
}

export { fetchLidoPositions } from './lido';
export { fetchAavePositions, fetchAavePositionsAllChains } from './aave';
export { fetchUniswapPositions } from './uniswap';
export { fetchRaydiumPositions } from './raydium';
