import type { Chain, TokenBalance, Transaction } from '@/types';

// Free public RPCs (no API key needed)
const PUBLIC_RPCS: Record<string, string> = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
  optimism: 'https://optimism-rpc.publicnode.com',
  base: 'https://base-rpc.publicnode.com',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
};

// Top tokens per chain (address, symbol, name, decimals)
const TOP_TOKENS: Record<string, [string, string, string, number][]> = {
  ethereum: [
    ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 'USD Coin', 6],
    ['0xdAC17F958D2ee523a2206206994597C13D831ec7', 'USDT', 'Tether', 6],
    ['0x6B175474E89094C44Da98b954EedeAC495271d0F', 'DAI', 'Dai', 18],
    ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 'Wrapped ETH', 18],
    ['0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 'WBTC', 'Wrapped BTC', 8],
    ['0x514910771AF9Ca656af840dff83E8264EcF986CA', 'LINK', 'Chainlink', 18],
    ['0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 'UNI', 'Uniswap', 18],
    ['0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', 'AAVE', 'Aave', 18],
    ['0xD533a949740bb3306d119CC777fa900bA034cd52', 'CRV', 'Curve', 18],
    ['0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', 'MATIC', 'Polygon', 18],
    ['0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', 'stETH', 'Lido Staked ETH', 18],
    ['0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', 'wstETH', 'Wrapped stETH', 18],
    ['0xBe9895146f7AF43049ca1c1AE358B0541Ea49704', 'cbETH', 'Coinbase ETH', 18],
    ['0xae78736Cd615f374D3085123A210448E74Fc6393', 'rETH', 'Rocket Pool ETH', 18],
    ['0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', 'SHIB', 'Shiba Inu', 18],
    ['0x6982508145454Ce325dDbE47a25d4ec3d2311933', 'PEPE', 'Pepe', 18],
    ['0x4d224452801ACEd8B2F0aebE155379bb5D594381', 'APE', 'ApeCoin', 18],
    ['0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', 'LDO', 'Lido DAO', 18],
    ['0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', 'SNX', 'Synthetix', 18],
    ['0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', 'MKR', 'Maker', 18],
  ],
  arbitrum: [
    ['0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 'USDC', 'USD Coin', 6],
    ['0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 'USDT', 'Tether', 6],
    ['0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', 'DAI', 'Dai', 18],
    ['0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 'WETH', 'Wrapped ETH', 18],
    ['0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', 'WBTC', 'Wrapped BTC', 8],
    ['0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', 'LINK', 'Chainlink', 18],
    ['0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', 'UNI', 'Uniswap', 18],
    ['0x912CE59144191C1204E64559FE8253a0e49E6548', 'ARB', 'Arbitrum', 18],
    ['0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', 'GMX', 'GMX', 18],
  ],
  optimism: [
    ['0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 'USDC', 'USD Coin', 6],
    ['0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', 'USDT', 'Tether', 6],
    ['0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', 'DAI', 'Dai', 18],
    ['0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped ETH', 18],
    ['0x4200000000000000000000000000000000000042', 'OP', 'Optimism', 18],
    ['0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6', 'LINK', 'Chainlink', 18],
    ['0x68f180fcCe6836688e9084f035309E29Bf0A2095', 'WBTC', 'Wrapped BTC', 8],
  ],
  base: [
    ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'USDC', 'USD Coin', 6],
    ['0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped ETH', 18],
    ['0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', 'DAI', 'Dai', 18],
    ['0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', 'cbETH', 'Coinbase ETH', 18],
    ['0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', 'USDbC', 'USD Base Coin', 6],
  ],
  polygon: [
    ['0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 'USDC', 'USD Coin', 6],
    ['0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 'USDT', 'Tether', 6],
    ['0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', 'DAI', 'Dai', 18],
    ['0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', 'WETH', 'Wrapped ETH', 18],
    ['0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', 'WBTC', 'Wrapped BTC', 8],
    ['0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', 'LINK', 'Chainlink', 18],
    ['0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 'WMATIC', 'Wrapped POL', 18],
    ['0xb33EaAd8d922B1083446DC23f610c2567fB5180f', 'UNI', 'Uniswap', 18],
  ],
};

const NATIVE_SYMBOLS: Record<string, string> = {
  ethereum: 'ETH', arbitrum: 'ETH', optimism: 'ETH', base: 'ETH', polygon: 'POL',
};

const BALANCE_OF_SELECTOR = '0x70a08231';

async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<any> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

function encodeBalanceOf(address: string): string {
  return BALANCE_OF_SELECTOR + address.toLowerCase().replace('0x', '').padStart(64, '0');
}

export async function fetchEVMBalances(
  address: string,
  chain: Chain,
  _apiKey?: string,
): Promise<TokenBalance[]> {
  const rpcUrl = PUBLIC_RPCS[chain];
  if (!rpcUrl) return [];

  try {
    const balances: TokenBalance[] = [];
    const nativeSymbol = NATIVE_SYMBOLS[chain] || 'ETH';

    // Fetch native balance
    const nativeHex = await rpcCall(rpcUrl, 'eth_getBalance', [address, 'latest']);
    const nativeWei = BigInt(nativeHex || '0x0');
    const nativeFormatted = Number(nativeWei) / 1e18;

    if (nativeFormatted > 0.0001) {
      balances.push({
        chain, walletAddress: address,
        contractAddress: '0x0000000000000000000000000000000000000000',
        symbol: nativeSymbol, name: nativeSymbol === 'POL' ? 'Polygon' : 'Ethereum',
        decimals: 18, balance: nativeWei.toString(), balanceFormatted: nativeFormatted,
        priceUsd: 0, valueUsd: 0,
      });
    }

    // Fetch top ERC-20 token balances using Multicall3
    const tokens = TOP_TOKENS[chain] || [];
    if (tokens.length > 0) {
      // Use individual eth_call for each token (batch via Promise.all)
      const tokenPromises = tokens.map(async ([tokenAddr, symbol, name, decimals]) => {
        try {
          const result = await rpcCall(rpcUrl, 'eth_call', [
            { to: tokenAddr, data: encodeBalanceOf(address) }, 'latest',
          ]);
          const raw = BigInt(result || '0x0');
          const formatted = Number(raw) / Math.pow(10, decimals);
          if (formatted < 0.000001) return null;

          return {
            chain, walletAddress: address, contractAddress: tokenAddr,
            symbol, name, decimals, balance: raw.toString(), balanceFormatted: formatted,
            priceUsd: 0, valueUsd: 0,
          } satisfies TokenBalance;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(tokenPromises);
      for (const r of results) {
        if (r) balances.push(r);
      }
    }

    return balances;
  } catch (error) {
    console.error(`[rpc] Error fetching balances on ${chain} for ${address}:`, error);
    return [];
  }
}

export async function fetchEVMTransactions(
  address: string,
  chain: Chain,
  _apiKey?: string,
): Promise<Transaction[]> {
  // Public RPCs don't have a good transaction history API
  // We'd need an indexer for this. For now, return empty
  // and let the Helius Solana provider handle Solana txs.
  // TODO: integrate a free indexer when available
  return [];
}

export async function fetchEVMAllChainBalances(
  address: string,
  chains: Chain[],
  _apiKey?: string,
): Promise<TokenBalance[]> {
  const evmChains = chains.filter((c) => c !== 'solana' && PUBLIC_RPCS[c]);
  const results = await Promise.all(
    evmChains.map((chain) => fetchEVMBalances(address, chain)),
  );
  return results.flat();
}
