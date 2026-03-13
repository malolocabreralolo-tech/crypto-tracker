import type { Chain, DeFiPosition } from '@/types';
import { ethCallRaw } from './rpc-helpers';

const POSITION_MANAGER_ADDRESSES: Partial<Record<Chain, string>> = {
  ethereum: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  arbitrum: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  optimism: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  base: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  polygon: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
};

const BALANCE_OF_SELECTOR = '0x70a08231';
const TOKEN_BY_INDEX_SELECTOR = '0x2f745c59';
const POSITIONS_SELECTOR = '0x99fbab88';
const SYMBOL_SELECTOR = '0x95d89b41';

function padAddress(address: string): string {
  return address.toLowerCase().replace('0x', '').padStart(64, '0');
}

function padUint256(value: number | bigint): string {
  return BigInt(value).toString(16).padStart(64, '0');
}

async function getTokenSymbol(chain: string, tokenAddress: string): Promise<string> {
  try {
    const result = await ethCallRaw(chain, tokenAddress, SYMBOL_SELECTOR);
    if (!result || result === '0x') return tokenAddress.slice(0, 10);
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
  _apiKey?: string
): Promise<DeFiPosition[]> {
  const pmAddress = POSITION_MANAGER_ADDRESSES[chain];
  if (!pmAddress) return [];

  try {
    const balanceResult = await ethCallRaw(
      chain, pmAddress, `${BALANCE_OF_SELECTOR}${padAddress(address)}`
    );
    const positionCount = Number(BigInt(balanceResult || '0x0'));
    if (positionCount === 0) return [];

    const limit = Math.min(positionCount, 20);
    const positions: DeFiPosition[] = [];

    for (let i = 0; i < limit; i++) {
      try {
        const tokenIdResult = await ethCallRaw(
          chain, pmAddress,
          `${TOKEN_BY_INDEX_SELECTOR}${padAddress(address)}${padUint256(i)}`
        );
        const tokenId = BigInt(tokenIdResult || '0x0');

        const positionResult = await ethCallRaw(
          chain, pmAddress,
          `${POSITIONS_SELECTOR}${padUint256(tokenId)}`
        );

        const data = positionResult.replace('0x', '');
        if (data.length < 384) continue;

        const token0Address = '0x' + data.slice(128 + 24, 192);
        const token1Address = '0x' + data.slice(192 + 24, 256);
        const liquidity = BigInt('0x' + data.slice(448, 512));

        if (liquidity === BigInt(0)) continue;

        const [symbol0, symbol1] = await Promise.all([
          getTokenSymbol(chain, token0Address),
          getTokenSymbol(chain, token1Address),
        ]);

        positions.push({
          chain, protocol: 'uniswap', type: 'liquidity',
          tokens: [
            { symbol: symbol0, amount: 0, valueUsd: 0 },
            { symbol: symbol1, amount: 0, valueUsd: 0 },
          ],
          totalValueUsd: 0, walletAddress: address,
        });
      } catch {
        continue;
      }
    }

    return positions;
  } catch (error) {
    console.error(`Failed to fetch Uniswap positions on ${chain}:`, error);
    return [];
  }
}
