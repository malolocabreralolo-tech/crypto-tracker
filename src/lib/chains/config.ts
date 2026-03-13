import { Network } from 'alchemy-sdk';
import type { Chain } from '@/types';

export interface ChainConfig {
  id: Chain;
  chainId: number | null;
  name: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  explorerUrl: string;
  alchemyNetwork: Network | null;
  rpcUrl: string;
}

export const CHAIN_CONFIG: Record<Chain, ChainConfig> = {
  ethereum: {
    id: 'ethereum',
    chainId: 1,
    name: 'Ethereum',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://etherscan.io',
    alchemyNetwork: Network.ETH_MAINNET,
    rpcUrl: 'https://eth.llamarpc.com',
  },
  arbitrum: {
    id: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://arbiscan.io',
    alchemyNetwork: Network.ARB_MAINNET,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
  },
  optimism: {
    id: 'optimism',
    chainId: 10,
    name: 'Optimism',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://optimistic.etherscan.io',
    alchemyNetwork: Network.OPT_MAINNET,
    rpcUrl: 'https://mainnet.optimism.io',
  },
  base: {
    id: 'base',
    chainId: 8453,
    name: 'Base',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://basescan.org',
    alchemyNetwork: Network.BASE_MAINNET,
    rpcUrl: 'https://mainnet.base.org',
  },
  polygon: {
    id: 'polygon',
    chainId: 137,
    name: 'Polygon',
    nativeCurrency: { symbol: 'POL', decimals: 18 },
    explorerUrl: 'https://polygonscan.com',
    alchemyNetwork: Network.MATIC_MAINNET,
    rpcUrl: 'https://polygon-rpc.com',
  },
  solana: {
    id: 'solana',
    chainId: null,
    name: 'Solana',
    nativeCurrency: { symbol: 'SOL', decimals: 9 },
    explorerUrl: 'https://solscan.io',
    alchemyNetwork: null,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  },
};

export const EVM_CHAINS: Chain[] = ['ethereum', 'arbitrum', 'optimism', 'base', 'polygon'];
export const ALL_CHAINS: Chain[] = [...EVM_CHAINS, 'solana'];

export function getExplorerTxUrl(chain: Chain, hash: string): string {
  const config = CHAIN_CONFIG[chain];
  if (chain === 'solana') {
    return `${config.explorerUrl}/tx/${hash}`;
  }
  return `${config.explorerUrl}/tx/${hash}`;
}

export function getExplorerAddressUrl(chain: Chain, address: string): string {
  const config = CHAIN_CONFIG[chain];
  if (chain === 'solana') {
    return `${config.explorerUrl}/account/${address}`;
  }
  return `${config.explorerUrl}/address/${address}`;
}
