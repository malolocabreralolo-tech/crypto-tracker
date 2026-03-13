import type { Chain, TokenBalance, Transaction } from '@/types';

const ANKR_URL = 'https://rpc.ankr.com/multichain';

// Map our chain names to Ankr blockchain identifiers
const CHAIN_TO_ANKR: Record<string, string> = {
  ethereum: 'eth',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  base: 'base',
  polygon: 'polygon',
};

const ANKR_TO_CHAIN: Record<string, Chain> = {
  eth: 'ethereum',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  base: 'base',
  polygon: 'polygon',
};

async function ankrCall(method: string, params: Record<string, unknown>) {
  const res = await fetch(ANKR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      id: 1,
      params,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ankr API error: ${res.status}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`Ankr RPC error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return data.result;
}

export async function fetchEVMBalances(
  address: string,
  chain: Chain,
  _apiKey?: string,
): Promise<TokenBalance[]> {
  const ankrChain = CHAIN_TO_ANKR[chain];
  if (!ankrChain) return [];

  try {
    const result = await ankrCall('ankr_getAccountBalance', {
      walletAddress: address,
      blockchain: [ankrChain],
      onlyWhitelisted: true,
      pageSize: 100,
    });

    const assets = result?.assets || [];

    return assets
      .filter((a: any) => {
        const bal = parseFloat(a.balance || '0');
        return bal > 0.000001;
      })
      .map((a: any) => ({
        chain,
        walletAddress: address,
        contractAddress: a.contractAddress || '0x0000000000000000000000000000000000000000',
        symbol: a.tokenSymbol || 'UNKNOWN',
        name: a.tokenName || 'Unknown Token',
        decimals: a.tokenDecimals || 18,
        balance: a.balanceRawInteger || '0',
        balanceFormatted: parseFloat(a.balance || '0'),
        priceUsd: parseFloat(a.tokenPrice || '0'),
        valueUsd: parseFloat(a.balanceUsd || '0'),
        logo: a.thumbnail || undefined,
      } satisfies TokenBalance));
  } catch (error) {
    console.error(`[ankr] Error fetching balances on ${chain} for ${address}:`, error);
    return [];
  }
}

export async function fetchEVMTransactions(
  address: string,
  chain: Chain,
  _apiKey?: string,
): Promise<Transaction[]> {
  const ankrChain = CHAIN_TO_ANKR[chain];
  if (!ankrChain) return [];

  try {
    const result = await ankrCall('ankr_getTransactionsByAddress', {
      address,
      blockchain: [ankrChain],
      descOrder: true,
      pageSize: 50,
    });

    const txs = result?.transactions || [];

    return txs.map((t: any) => {
      const value = t.value ? parseInt(t.value, 16) / 1e18 : 0;
      const gasUsed = t.gasUsed ? parseInt(t.gasUsed, 16) : 0;
      const gasPrice = t.gasPrice ? parseInt(t.gasPrice, 16) : 0;
      const feeEth = (gasUsed * gasPrice) / 1e18;

      const isSent = t.from?.toLowerCase() === address.toLowerCase();

      const tx: Transaction = {
        chain,
        hash: t.hash || '',
        type: t.input && t.input !== '0x' ? 'swap' : 'transfer',
        from: t.from || '',
        to: t.to || '',
        timestamp: t.timestamp ? parseInt(t.timestamp, 16) * 1000 : Date.now(),
        fee: { amount: feeEth, valueUsd: 0 },
        walletAddress: address,
      };

      if (value > 0) {
        const nativeSymbol = chain === 'polygon' ? 'POL' : 'ETH';
        if (isSent) {
          tx.tokenIn = { symbol: nativeSymbol, amount: value, valueUsd: 0 };
        } else {
          tx.tokenOut = { symbol: nativeSymbol, amount: value, valueUsd: 0 };
        }
      }

      return tx;
    });
  } catch (error) {
    console.error(`[ankr] Error fetching transactions on ${chain} for ${address}:`, error);
    return [];
  }
}

export async function fetchEVMAllChainBalances(
  address: string,
  chains: Chain[],
  _apiKey?: string,
): Promise<TokenBalance[]> {
  // Ankr can fetch ALL chains in one call — much more efficient
  const ankrChains = chains
    .filter((c) => c !== 'solana')
    .map((c) => CHAIN_TO_ANKR[c])
    .filter(Boolean);

  if (ankrChains.length === 0) return [];

  try {
    const result = await ankrCall('ankr_getAccountBalance', {
      walletAddress: address,
      blockchain: ankrChains,
      onlyWhitelisted: true,
      pageSize: 100,
    });

    const assets = result?.assets || [];

    return assets
      .filter((a: any) => parseFloat(a.balance || '0') > 0.000001)
      .map((a: any) => {
        const ankrChain = a.blockchain || 'eth';
        const chain = ANKR_TO_CHAIN[ankrChain] || 'ethereum';

        return {
          chain,
          walletAddress: address,
          contractAddress: a.contractAddress || '0x0000000000000000000000000000000000000000',
          symbol: a.tokenSymbol || 'UNKNOWN',
          name: a.tokenName || 'Unknown Token',
          decimals: a.tokenDecimals || 18,
          balance: a.balanceRawInteger || '0',
          balanceFormatted: parseFloat(a.balance || '0'),
          priceUsd: parseFloat(a.tokenPrice || '0'),
          valueUsd: parseFloat(a.balanceUsd || '0'),
          logo: a.thumbnail || undefined,
        } satisfies TokenBalance;
      });
  } catch (error) {
    console.error(`[ankr] Error fetching all chain balances for ${address}:`, error);
    return [];
  }
}
