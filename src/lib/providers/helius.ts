import type { TokenBalance, Transaction } from '@/types';

const DEMO_API_KEY = ''; // Helius requires a real key; empty string will fail gracefully
const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com';
const HELIUS_API_URL = 'https://api.helius.xyz';

const SOL_DECIMALS = 9;
const LAMPORTS_PER_SOL = 1_000_000_000;

export async function fetchSolanaBalances(
  address: string,
  apiKey?: string,
): Promise<TokenBalance[]> {
  const key = apiKey || DEMO_API_KEY;
  if (!key) {
    console.warn('[helius] No Helius API key configured. Skipping Solana balances.');
    return [];
  }

  try {
    const balances: TokenBalance[] = [];

    // Fetch native SOL balance
    const solBalanceResponse = await fetch(`${HELIUS_RPC_URL}/?api-key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'sol-balance',
        method: 'getBalance',
        params: [address],
      }),
    });

    if (solBalanceResponse.ok) {
      const solData = await solBalanceResponse.json();
      const lamports = solData?.result?.value || 0;
      const solBalance = lamports / LAMPORTS_PER_SOL;

      if (solBalance > 0) {
        balances.push({
          chain: 'solana',
          walletAddress: address,
          contractAddress: 'So11111111111111111111111111111111111111112', // Wrapped SOL mint
          symbol: 'SOL',
          name: 'Solana',
          decimals: SOL_DECIMALS,
          balance: lamports.toString(),
          balanceFormatted: solBalance,
          priceUsd: 0,
          valueUsd: 0,
        });
      }
    }

    // Fetch SPL token balances using DAS getAssetsByOwner
    const assetsResponse = await fetch(`${HELIUS_RPC_URL}/?api-key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'das-assets',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: address,
          displayOptions: {
            showFungible: true,
            showNativeBalance: false,
          },
          page: 1,
          limit: 100,
        },
      }),
    });

    if (assetsResponse.ok) {
      const assetsData = await assetsResponse.json();
      const items = assetsData?.result?.items || [];

      for (const item of items) {
        // Only include fungible tokens
        if (item.interface !== 'FungibleToken' && item.interface !== 'FungibleAsset') {
          continue;
        }

        const tokenInfo = item.token_info;
        if (!tokenInfo) continue;

        const rawBalance = BigInt(tokenInfo.balance || '0');
        const decimals = tokenInfo.decimals || 0;
        const balanceFormatted = Number(rawBalance) / Math.pow(10, decimals);

        if (balanceFormatted < 0.000001) continue;

        balances.push({
          chain: 'solana',
          walletAddress: address,
          contractAddress: item.id || '',
          symbol: tokenInfo.symbol || item.content?.metadata?.symbol || 'UNKNOWN',
          name: item.content?.metadata?.name || 'Unknown Token',
          decimals,
          balance: rawBalance.toString(),
          balanceFormatted,
          priceUsd: tokenInfo.price_info?.price_per_token || 0,
          valueUsd: tokenInfo.price_info?.total_price || 0,
          logo: item.content?.links?.image || item.content?.files?.[0]?.uri || undefined,
        });
      }
    }

    return balances;
  } catch (error) {
    console.error(`[helius] Error fetching Solana balances for ${address}:`, error);
    return [];
  }
}

interface HeliusTransaction {
  signature: string;
  type: string;
  source: string;
  timestamp: number;
  fee: number;
  feePayer: string;
  nativeTransfers?: {
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }[];
  tokenTransfers?: {
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }[];
  description?: string;
  events?: {
    swap?: {
      nativeInput?: { account: string; amount: string };
      nativeOutput?: { account: string; amount: string };
      tokenInputs?: { userAccount: string; tokenAccount: string; mint: string; rawTokenAmount: { tokenAmount: string; decimals: number } }[];
      tokenOutputs?: { userAccount: string; tokenAccount: string; mint: string; rawTokenAmount: { tokenAmount: string; decimals: number } }[];
    };
  };
}

function mapHeliusType(heliusType: string): Transaction['type'] {
  const typeMap: Record<string, Transaction['type']> = {
    TRANSFER: 'transfer',
    SWAP: 'swap',
    BRIDGE: 'bridge',
    STAKE: 'stake',
    UNSTAKE: 'unstake',
    TOKEN_MINT: 'other',
    BURN: 'other',
    APPROVE: 'approve',
    COMPRESSED_NFT_TRANSFER: 'other',
    NFT_SALE: 'other',
  };
  return typeMap[heliusType] || 'other';
}

export async function fetchSolanaTransactions(
  address: string,
  apiKey?: string,
): Promise<Transaction[]> {
  const key = apiKey || DEMO_API_KEY;
  if (!key) {
    console.warn('[helius] No Helius API key configured. Skipping Solana transactions.');
    return [];
  }

  try {
    const url = `${HELIUS_API_URL}/v0/addresses/${address}/transactions?api-key=${key}&limit=50`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[helius] Transactions API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const heliusTxs: HeliusTransaction[] = await response.json();

    return heliusTxs.map((htx) => {
      const tx: Transaction = {
        chain: 'solana',
        hash: htx.signature,
        type: mapHeliusType(htx.type),
        from: htx.feePayer || '',
        to: '',
        timestamp: htx.timestamp * 1000,
        fee: {
          amount: htx.fee / LAMPORTS_PER_SOL,
          valueUsd: 0,
        },
        walletAddress: address,
      };

      // Extract token in/out from native transfers
      if (htx.nativeTransfers && htx.nativeTransfers.length > 0) {
        const sent = htx.nativeTransfers.find(
          (nt) => nt.fromUserAccount === address,
        );
        const received = htx.nativeTransfers.find(
          (nt) => nt.toUserAccount === address,
        );

        if (sent) {
          tx.to = sent.toUserAccount;
          tx.tokenIn = {
            symbol: 'SOL',
            amount: sent.amount / LAMPORTS_PER_SOL,
            valueUsd: 0,
          };
        }
        if (received) {
          tx.tokenOut = {
            symbol: 'SOL',
            amount: received.amount / LAMPORTS_PER_SOL,
            valueUsd: 0,
          };
        }
      }

      // Extract token in/out from token transfers
      if (htx.tokenTransfers && htx.tokenTransfers.length > 0) {
        const sent = htx.tokenTransfers.find(
          (tt) => tt.fromUserAccount === address,
        );
        const received = htx.tokenTransfers.find(
          (tt) => tt.toUserAccount === address,
        );

        if (sent) {
          tx.to = sent.toUserAccount;
          tx.tokenIn = {
            symbol: sent.mint.slice(0, 6),
            amount: sent.tokenAmount,
            valueUsd: 0,
          };
        }
        if (received) {
          tx.tokenOut = {
            symbol: received.mint.slice(0, 6),
            amount: received.tokenAmount,
            valueUsd: 0,
          };
        }
      }

      return tx;
    });
  } catch (error) {
    console.error(`[helius] Error fetching Solana transactions for ${address}:`, error);
    return [];
  }
}
