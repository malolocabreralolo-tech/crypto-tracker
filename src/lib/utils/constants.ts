import type { Chain } from '@/types';

/**
 * Zero address used for native ETH balances.
 */
export const ETH_ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Native SOL mint address on Solana.
 */
export const SOL_NATIVE_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Well-known token addresses per chain.
 */
export const KNOWN_TOKENS: Record<string, Record<Chain, string | null>> = {
  WETH: {
    ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    optimism: '0x4200000000000000000000000000000000000006',
    base: '0x4200000000000000000000000000000000000006',
    polygon: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    solana: null,
    hyperliquid: null,
  },
  USDC: {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    solana: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    hyperliquid: null,
  },
  USDT: {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    base: null,
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    solana: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    hyperliquid: null,
  },
  DAI: {
    ethereum: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    arbitrum: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    optimism: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    base: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    polygon: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    solana: null,
    hyperliquid: null,
  },
};

/**
 * CoinGecko asset platform IDs for token logo URLs.
 */
export const COINGECKO_PLATFORM_IDS: Record<Chain, string | null> = {
  ethereum: 'ethereum',
  arbitrum: 'arbitrum-one',
  optimism: 'optimistic-ethereum',
  base: 'base',
  polygon: 'polygon-pos',
  solana: 'solana',
  hyperliquid: null,
};

/**
 * Base URL for token logos via CoinGecko CDN.
 * Usage: `${TOKEN_LOGO_CDN}/${platformId}/images/${contractAddress}/small/${filename}`
 * Or simpler: `https://assets.coingecko.com/coins/images/{id}/small/{filename}`
 */
export const TOKEN_LOGO_CDN = 'https://assets.coingecko.com/coins/images';

/**
 * Stablecoin addresses for quick identification.
 */
export const STABLECOIN_SYMBOLS = new Set(['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'LUSD', 'TUSD', 'USDP']);

/**
 * Native token symbols per chain.
 */
export const NATIVE_TOKEN_SYMBOL: Record<Chain, string> = {
  ethereum: 'ETH',
  arbitrum: 'ETH',
  optimism: 'ETH',
  base: 'ETH',
  polygon: 'POL',
  solana: 'SOL',
  hyperliquid: 'USDC',
};
