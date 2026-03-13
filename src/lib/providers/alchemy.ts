import { Alchemy, AssetTransfersCategory, SortingOrder, Utils } from 'alchemy-sdk';
import type { Chain, TokenBalance, Transaction } from '@/types';
import { CHAIN_CONFIG } from '@/lib/chains/config';

const DEMO_API_KEY = 'demo'; // Alchemy allows 'demo' for limited usage

// Cache Alchemy instances per chain+key
const instanceCache = new Map<string, Alchemy>();

export function getAlchemy(chain: Chain, apiKey?: string): Alchemy {
  const key = apiKey || DEMO_API_KEY;
  const config = CHAIN_CONFIG[chain];

  if (!config.alchemyNetwork) {
    throw new Error(`Chain ${chain} is not an EVM chain supported by Alchemy`);
  }

  const cacheKey = `${chain}:${key}`;
  const cached = instanceCache.get(cacheKey);
  if (cached) return cached;

  const instance = new Alchemy({
    apiKey: key,
    network: config.alchemyNetwork,
  });

  instanceCache.set(cacheKey, instance);
  return instance;
}

export async function fetchEVMBalances(
  address: string,
  chain: Chain,
  apiKey?: string,
): Promise<TokenBalance[]> {
  try {
    const alchemy = getAlchemy(chain, apiKey);
    const config = CHAIN_CONFIG[chain];
    const balances: TokenBalance[] = [];

    // Fetch native balance (ETH/POL)
    const nativeBalanceWei = await alchemy.core.getBalance(address);
    const nativeBalance = parseFloat(Utils.formatEther(nativeBalanceWei));
    if (nativeBalance > 0) {
      balances.push({
        chain,
        walletAddress: address,
        contractAddress: '0x0000000000000000000000000000000000000000',
        symbol: config.nativeCurrency.symbol,
        name: config.nativeCurrency.symbol === 'POL' ? 'Polygon' : 'Ethereum',
        decimals: config.nativeCurrency.decimals,
        balance: nativeBalanceWei.toString(),
        balanceFormatted: nativeBalance,
        priceUsd: 0, // Will be filled by price provider
        valueUsd: 0,
      });
    }

    // Fetch ERC-20 token balances
    const tokenBalancesResponse = await alchemy.core.getTokenBalances(address);

    // Filter out zero balances and fetch metadata
    const nonZeroBalances = tokenBalancesResponse.tokenBalances.filter(
      (tb) => tb.tokenBalance && tb.tokenBalance !== '0x0' && tb.tokenBalance !== '0x' && BigInt(tb.tokenBalance || '0') > BigInt(0),
    );

    // Fetch metadata in parallel (limit concurrency to avoid rate limits)
    const metadataPromises = nonZeroBalances.slice(0, 50).map(async (tb) => {
      try {
        const metadata = await alchemy.core.getTokenMetadata(tb.contractAddress);
        const rawBalance = BigInt(tb.tokenBalance || '0');
        const decimals = metadata.decimals || 18;
        const balanceFormatted = Number(rawBalance) / Math.pow(10, decimals);

        if (balanceFormatted < 0.000001) return null;

        return {
          chain,
          walletAddress: address,
          contractAddress: tb.contractAddress,
          symbol: metadata.symbol || 'UNKNOWN',
          name: metadata.name || 'Unknown Token',
          decimals,
          balance: rawBalance.toString(),
          balanceFormatted,
          priceUsd: 0,
          valueUsd: 0,
          logo: metadata.logo || undefined,
        } satisfies TokenBalance;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(metadataPromises);
    for (const r of results) {
      if (r) balances.push(r);
    }

    return balances;
  } catch (error) {
    console.error(`[alchemy] Error fetching balances on ${chain} for ${address}:`, error);
    return [];
  }
}

export async function fetchEVMTransactions(
  address: string,
  chain: Chain,
  apiKey?: string,
): Promise<Transaction[]> {
  try {
    const alchemy = getAlchemy(chain, apiKey);
    const addressLower = address.toLowerCase();

    // Fetch both sent and received transfers
    const [sentTransfers, receivedTransfers] = await Promise.all([
      alchemy.core.getAssetTransfers({
        fromAddress: address,
        category: [
          AssetTransfersCategory.EXTERNAL,
          AssetTransfersCategory.ERC20,
          AssetTransfersCategory.INTERNAL,
        ],
        order: SortingOrder.DESCENDING,
        maxCount: 50,
        withMetadata: true,
      }),
      alchemy.core.getAssetTransfers({
        toAddress: address,
        category: [
          AssetTransfersCategory.EXTERNAL,
          AssetTransfersCategory.ERC20,
          AssetTransfersCategory.INTERNAL,
        ],
        order: SortingOrder.DESCENDING,
        maxCount: 50,
        withMetadata: true,
      }),
    ]);

    const txMap = new Map<string, Transaction>();

    const processTransfer = (
      transfer: (typeof sentTransfers.transfers)[0],
      direction: 'sent' | 'received',
    ) => {
      const hash = transfer.hash;
      const existing = txMap.get(hash);

      // Determine type
      let type: Transaction['type'] = 'transfer';
      if (transfer.category === 'erc20' && existing) {
        type = 'swap'; // Multiple token movements in same tx = likely swap
      }

      const amount = transfer.value || 0;
      const symbol = transfer.asset || 'ETH';
      const tokenData = { symbol, amount, valueUsd: 0 };

      if (existing) {
        // If we already have this tx, it might be a swap
        existing.type = 'swap';
        if (direction === 'sent' && !existing.tokenIn) {
          existing.tokenIn = tokenData;
        } else if (direction === 'received' && !existing.tokenOut) {
          existing.tokenOut = tokenData;
        }
        return;
      }

      const metadata = transfer.metadata as { blockTimestamp?: string } | undefined;
      const timestamp = metadata?.blockTimestamp
        ? new Date(metadata.blockTimestamp).getTime()
        : Date.now();

      const tx: Transaction = {
        chain,
        hash,
        type,
        from: transfer.from || '',
        to: transfer.to || '',
        timestamp,
        fee: { amount: 0, valueUsd: 0 },
        walletAddress: address,
      };

      if (direction === 'sent') {
        tx.tokenIn = tokenData;
      } else {
        tx.tokenOut = tokenData;
      }

      // Detect if it's a contract interaction (approve, stake, etc.)
      if (transfer.to && transfer.from) {
        const fromLower = transfer.from.toLowerCase();
        const toLower = transfer.to.toLowerCase();
        if (fromLower === addressLower && toLower === addressLower) {
          tx.type = 'other';
        }
      }

      txMap.set(hash, tx);
    };

    for (const t of sentTransfers.transfers) processTransfer(t, 'sent');
    for (const t of receivedTransfers.transfers) processTransfer(t, 'received');

    // Sort by timestamp descending
    return Array.from(txMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error(`[alchemy] Error fetching transactions on ${chain} for ${address}:`, error);
    return [];
  }
}

export async function fetchEVMAllChainBalances(
  address: string,
  chains: Chain[],
  apiKey?: string,
): Promise<TokenBalance[]> {
  const evmChains = chains.filter((c) => c !== 'solana');
  const results = await Promise.all(
    evmChains.map((chain) => fetchEVMBalances(address, chain, apiKey)),
  );
  return results.flat();
}
