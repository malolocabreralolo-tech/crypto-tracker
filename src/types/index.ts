export type Chain = 'ethereum' | 'arbitrum' | 'optimism' | 'base' | 'polygon' | 'solana';

export interface Wallet {
  id: string;
  address: string;
  label: string;
  chains: Chain[];
  addedAt: number;
}

export interface Settings {
  alchemyApiKey: string;
  heliusApiKey: string;
  currency: string;
  theme: 'dark' | 'light';
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface TokenBalance {
  chain: Chain;
  walletAddress: string;
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceFormatted: number;
  priceUsd: number;
  valueUsd: number;
  change24h?: number;
  logo?: string;
}

export interface Transaction {
  chain: Chain;
  hash: string;
  type: 'transfer' | 'swap' | 'bridge' | 'stake' | 'unstake' | 'approve' | 'other';
  from: string;
  to: string;
  timestamp: number;
  tokenIn?: { symbol: string; amount: number; valueUsd: number };
  tokenOut?: { symbol: string; amount: number; valueUsd: number };
  fee: { amount: number; valueUsd: number };
  walletAddress: string;
}

export interface DeFiPosition {
  chain: Chain;
  protocol: string;
  type: 'staking' | 'lending' | 'liquidity';
  tokens: { symbol: string; amount: number; valueUsd: number }[];
  totalValueUsd: number;
  apy?: number;
  walletAddress: string;
}

export interface PortfolioSnapshot {
  timestamp: number;
  totalValueUsd: number;
  byChain: Record<Chain, number>;
}
