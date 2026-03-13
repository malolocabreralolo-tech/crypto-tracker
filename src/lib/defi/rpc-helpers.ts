import type { Chain } from '@/types';

const PUBLIC_RPCS: Record<string, string> = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
  optimism: 'https://optimism-rpc.publicnode.com',
  base: 'https://base-rpc.publicnode.com',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
};

const BALANCE_OF_SELECTOR = '0x70a08231';

function encodeAddress(address: string): string {
  return address.toLowerCase().replace('0x', '').padStart(64, '0');
}

function decodeUint256(hex: string): bigint {
  if (!hex || hex === '0x' || hex === '0x0') return BigInt(0);
  return BigInt(hex);
}

export async function rpcCall(chain: string, method: string, params: unknown[]): Promise<any> {
  const rpcUrl = PUBLIC_RPCS[chain];
  if (!rpcUrl) throw new Error(`No RPC for chain: ${chain}`);

  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export async function ethCall(
  chain: string,
  contractAddress: string,
  method: 'balanceOf' | 'getUserAccountData',
  address: string
): Promise<bigint> {
  try {
    let data: string;
    if (method === 'balanceOf') {
      data = `${BALANCE_OF_SELECTOR}${encodeAddress(address)}`;
    } else if (method === 'getUserAccountData') {
      data = `0xbf92857c${encodeAddress(address)}`;
    } else {
      throw new Error(`Unknown method: ${method}`);
    }

    const result = await rpcCall(chain, 'eth_call', [
      { to: contractAddress, data },
      'latest',
    ]);

    return decodeUint256(result);
  } catch (error) {
    console.error(`[rpc] eth_call failed on ${chain} for ${contractAddress}:`, error);
    return BigInt(0);
  }
}

export async function ethCallRaw(
  chain: string,
  contractAddress: string,
  data: string
): Promise<string> {
  try {
    return await rpcCall(chain, 'eth_call', [
      { to: contractAddress, data },
      'latest',
    ]);
  } catch (error) {
    console.error(`[rpc] eth_call raw failed on ${chain}:`, error);
    return '0x';
  }
}
