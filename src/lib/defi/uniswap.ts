import { Alchemy, Network } from 'alchemy-sdk';
import type { Chain, DeFiPosition } from '@/types';
import { CHAIN_CONFIG } from '@/lib/chains/config';

// Uniswap v3 NonfungiblePositionManager addresses per chain
const POSITION_MANAGER_ADDRESSES: Partial<Record<Chain, string>> = {
  ethereum: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  arbitrum: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  optimism: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  base: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  polygon: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
};

// Function selectors
const BALANCE_OF_SELECTOR = '0x70a08231'; // balanceOf(address)
const TOKEN_BY_INDEX_SELECTOR = '0x2f745c59'; // tokenOfOwnerByIndex(address,uint256)
const POSITIONS_SELECTOR = '0x99fbab88'; // positions(uint256)

// ERC-20 symbol() selector
const SYMBOL_SELECTOR = '0x95d89b41';

function padAddress(address: string): string {
  return address.toLowerCase().replace('0x', '').padStart(64, '0');
}

function padUint256(value: number | bigint): string {
  return BigInt(value).toString(16).padStart(64, '0');
}

function decodeUint256(hex: string): bigint {
  if (!hex || hex === '0x' || hex === '0x0') return BigInt(0);
  return BigInt(hex);
}

function getAlchemyNetwork(chain: Chain): Network | null {
  return CHAIN_CONFIG[chain]?.alchemyNetwork ?? null;
}

async function getTokenSymbol(alchemy: Alchemy, tokenAddress: string): Promise<string> {
  try {
    const result = await alchemy.core.call({
      to: tokenAddress,
      data: SYMBOL_SELECTOR,
    });

    if (!result || result === '0x') return tokenAddress.slice(0, 10);

    // Decode string: first 32 bytes = offset, next 32 = length, then data
    const data = result.replace('0x', '');
    if (data.length < 128) return tokenAddress.slice(0, 10);

    const length = Number(BigInt('0x' + data.slice(64, 128)));
    const symbolHex = data.slice(128, 128 + length * 2);
    const symbol = Buffer.from(symbolHex, 'hex').toString('utf8').replace(/\0/g, '');
    return symbol || tokenAddress.slice(0, 10);
  } catch {
    return tokenAddress.slice(0, 10);
  }
}

export async function fetchUniswapPositions(
  address: string,
  chain: Chain,
  apiKey?: string
): Promise<DeFiPosition[]> {
  const positionManagerAddress = POSITION_MANAGER_ADDRESSES[chain];
  if (!positionManagerAddress) return [];

  const network = getAlchemyNetwork(chain);
  if (!network) return [];

  const alchemy = new Alchemy({
    apiKey: apiKey || 'demo',
    network,
  });

  try {
    // Get number of positions owned by address
    const balanceResult = await alchemy.core.call({
      to: positionManagerAddress,
      data: `${BALANCE_OF_SELECTOR}${padAddress(address)}`,
    });

    const positionCount = Number(decodeUint256(balanceResult));
    if (positionCount === 0) return [];

    // Limit to first 20 positions to avoid excessive calls
    const limit = Math.min(positionCount, 20);
    const positions: DeFiPosition[] = [];

    for (let i = 0; i < limit; i++) {
      try {
        // Get token ID at index
        const tokenIdResult = await alchemy.core.call({
          to: positionManagerAddress,
          data: `${TOKEN_BY_INDEX_SELECTOR}${padAddress(address)}${padUint256(i)}`,
        });

        const tokenId = decodeUint256(tokenIdResult);

        // Get position details
        const positionResult = await alchemy.core.call({
          to: positionManagerAddress,
          data: `${POSITIONS_SELECTOR}${padUint256(tokenId)}`,
        });

        const data = positionResult.replace('0x', '');
        if (data.length < 384) continue;

        // positions() returns: (nonce, operator, token0, token1, fee, tickLower, tickUpper, liquidity, ...)
        // Each field is 32 bytes (64 hex chars)
        // token0 is at index 2 (offset 128), token1 at index 3 (offset 192)
        // liquidity is at index 7 (offset 448)
        const token0Address = '0x' + data.slice(128 + 24, 192); // last 20 bytes of slot 2
        const token1Address = '0x' + data.slice(192 + 24, 256); // last 20 bytes of slot 3
        const liquidity = BigInt('0x' + data.slice(448, 512));

        // Skip positions with zero liquidity (closed)
        if (liquidity === BigInt(0)) continue;

        // Get token symbols
        const [symbol0, symbol1] = await Promise.all([
          getTokenSymbol(alchemy, token0Address),
          getTokenSymbol(alchemy, token1Address),
        ]);

        // We can't easily compute the exact USD value of a Uniswap v3 position
        // without knowing the current tick and doing complex math.
        // We report the position with 0 USD value — the aggregator/price layer
        // should fill in real values if needed.
        positions.push({
          chain,
          protocol: 'uniswap',
          type: 'liquidity',
          tokens: [
            { symbol: symbol0, amount: 0, valueUsd: 0 },
            { symbol: symbol1, amount: 0, valueUsd: 0 },
          ],
          totalValueUsd: 0,
          walletAddress: address,
        });
      } catch (error) {
        console.error(`Failed to fetch Uniswap position at index ${i}:`, error);
        continue;
      }
    }

    return positions;
  } catch (error) {
    console.error(`Failed to fetch Uniswap positions on ${chain}:`, error);
    return [];
  }
}
