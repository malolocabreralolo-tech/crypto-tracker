import { Connection, PublicKey } from '@solana/web3.js';
import type { DeFiPosition } from '@/types';

const RAYDIUM_AMM_PROGRAM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

// Helius DAS (Digital Asset Standard) API endpoint
function getHeliusUrl(apiKey: string): string {
  return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
}

interface HeliusAsset {
  id: string;
  content?: {
    metadata?: {
      name?: string;
      symbol?: string;
    };
  };
  token_info?: {
    balance?: number;
    decimals?: number;
    price_info?: {
      price_per_token?: number;
      total_price?: number;
    };
  };
  ownership?: {
    owner?: string;
  };
  authorities?: Array<{
    address: string;
    scopes: string[];
  }>;
  compression?: {
    compressed?: boolean;
  };
}

interface HeliusDASResponse {
  result?: {
    items?: HeliusAsset[];
    total?: number;
  };
}

async function fetchTokenAccountsViaHelius(
  address: string,
  apiKey: string
): Promise<HeliusAsset[]> {
  const url = getHeliusUrl(apiKey);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'raydium-positions',
        method: 'searchAssets',
        params: {
          ownerAddress: address,
          tokenType: 'fungible',
          displayOptions: {
            showFungible: true,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Helius API returned ${response.status}`);
    }

    const data: HeliusDASResponse = await response.json();
    return data.result?.items ?? [];
  } catch (error) {
    console.error('Failed to fetch token accounts from Helius:', error);
    return [];
  }
}

/**
 * Check if an SPL token is a Raydium LP token by examining its mint authority
 * or known Raydium LP token patterns.
 *
 * Raydium AMM LP tokens are minted by the Raydium AMM program (675kPX...).
 */
function isRaydiumLPToken(asset: HeliusAsset): boolean {
  // Check if any authority matches the Raydium AMM program
  if (asset.authorities) {
    for (const auth of asset.authorities) {
      if (auth.address === RAYDIUM_AMM_PROGRAM) {
        return true;
      }
    }
  }

  // Also check by name/symbol patterns common to Raydium LP tokens
  const name = asset.content?.metadata?.name?.toLowerCase() ?? '';
  const symbol = asset.content?.metadata?.symbol?.toLowerCase() ?? '';

  if (name.includes('raydium') && (name.includes('lp') || name.includes('liquidity'))) {
    return true;
  }
  if (symbol.includes('ray') && symbol.includes('lp')) {
    return true;
  }

  return false;
}

/**
 * Fallback: use standard Solana RPC to find token accounts owned by the address
 * that are associated with the Raydium AMM program.
 */
async function fetchRaydiumViaRPC(address: string): Promise<DeFiPosition[]> {
  try {
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const ownerPubkey = new PublicKey(address);
    const raydiumProgramId = new PublicKey(RAYDIUM_AMM_PROGRAM);

    // Get all token accounts — Raydium LP tokens will be SPL tokens
    // whose mint authority is the Raydium AMM program
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    const positions: DeFiPosition[] = [];

    for (const account of tokenAccounts.value) {
      const parsed = account.account.data.parsed?.info;
      if (!parsed) continue;

      const mintAddress = parsed.mint;
      const amount = parsed.tokenAmount?.uiAmount ?? 0;

      if (amount <= 0) continue;

      // Check if this mint's authority is the Raydium program
      try {
        const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
        const mintData = (mintInfo.value?.data as { parsed?: { info?: { mintAuthority?: string } } })?.parsed?.info;

        if (mintData?.mintAuthority === RAYDIUM_AMM_PROGRAM) {
          positions.push({
            chain: 'solana',
            protocol: 'raydium',
            type: 'liquidity',
            tokens: [
              {
                symbol: `RAY-LP-${mintAddress.slice(0, 6)}`,
                amount,
                valueUsd: 0, // Price to be filled by aggregator
              },
            ],
            totalValueUsd: 0,
            walletAddress: address,
          });
        }
      } catch {
        // Skip mints we can't inspect
        continue;
      }
    }

    return positions;
  } catch (error) {
    console.error('Failed to fetch Raydium positions via RPC:', error);
    return [];
  }
}

export async function fetchRaydiumPositions(
  address: string,
  apiKey?: string
): Promise<DeFiPosition[]> {
  // Prefer Helius DAS API if key is available
  if (apiKey) {
    try {
      const assets = await fetchTokenAccountsViaHelius(address, apiKey);
      const raydiumAssets = assets.filter(isRaydiumLPToken);

      return raydiumAssets.map((asset): DeFiPosition => {
        const symbol = asset.content?.metadata?.symbol ?? `RAY-LP-${asset.id.slice(0, 6)}`;
        const balance = asset.token_info?.balance ?? 0;
        const decimals = asset.token_info?.decimals ?? 6;
        const amount = balance / Math.pow(10, decimals);
        const totalPrice = asset.token_info?.price_info?.total_price ?? 0;

        return {
          chain: 'solana',
          protocol: 'raydium',
          type: 'liquidity',
          tokens: [
            {
              symbol,
              amount,
              valueUsd: totalPrice,
            },
          ],
          totalValueUsd: totalPrice,
          walletAddress: address,
        };
      });
    } catch (error) {
      console.error('Helius DAS failed, falling back to RPC:', error);
    }
  }

  // Fallback to standard Solana RPC
  return fetchRaydiumViaRPC(address);
}
