import type { Chain } from '@/types';

export interface ChainConfig {
  id: Chain;
  chainId: number | null;
  name: string;
  nativeCurrency: { symbol: string; decimals: number };
  explorerUrl: string;
  rpcUrl: string;
}

export const CHAIN_CONFIG: Record<Chain, ChainConfig> = {
  ethereum: {
    id: 'ethereum', chainId: 1, name: 'Ethereum',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://etherscan.io',
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
  },
  arbitrum: {
    id: 'arbitrum', chainId: 42161, name: 'Arbitrum',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://arbiscan.io',
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
  },
  optimism: {
    id: 'optimism', chainId: 10, name: 'Optimism',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://optimistic.etherscan.io',
    rpcUrl: 'https://optimism-rpc.publicnode.com',
  },
  base: {
    id: 'base', chainId: 8453, name: 'Base',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://basescan.org',
    rpcUrl: 'https://base-rpc.publicnode.com',
  },
  polygon: {
    id: 'polygon', chainId: 137, name: 'Polygon',
    nativeCurrency: { symbol: 'POL', decimals: 18 },
    explorerUrl: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
  },
  solana: {
    id: 'solana', chainId: null, name: 'Solana',
    nativeCurrency: { symbol: 'SOL', decimals: 9 },
    explorerUrl: 'https://solscan.io',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  },
  hyperliquid: {
    id: 'hyperliquid', chainId: null, name: 'Hyperliquid',
    nativeCurrency: { symbol: 'USDC', decimals: 6 },
    explorerUrl: 'https://app.hyperliquid.xyz',
    rpcUrl: 'https://api.hyperliquid.xyz',
  },
};

export const EVM_CHAINS: Chain[] = ['ethereum', 'arbitrum', 'optimism', 'base', 'polygon'];
export const ALL_CHAINS: Chain[] = [...EVM_CHAINS, 'solana', 'hyperliquid'];

export function getExplorerTxUrl(chain: Chain, hash: string): string {
  return `${CHAIN_CONFIG[chain].explorerUrl}/tx/${hash}`;
}

export function getExplorerAddressUrl(chain: Chain, address: string): string {
  if (chain === 'solana') return `${CHAIN_CONFIG[chain].explorerUrl}/account/${address}`;
  if (chain === 'hyperliquid') return `${CHAIN_CONFIG[chain].explorerUrl}/explorer/address/${address}`;
  return `${CHAIN_CONFIG[chain].explorerUrl}/address/${address}`;
}
