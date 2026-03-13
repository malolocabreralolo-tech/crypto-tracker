const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type AddressType = 'evm' | 'solana';

/**
 * Detect chain type from address format.
 * - 0x-prefixed 40-hex-char addresses are EVM
 * - Base58 addresses (32-44 chars, no 0x prefix) are Solana
 * Returns null if address format is unrecognized.
 */
export function detectChain(address: string): AddressType | null {
  const trimmed = address.trim();

  if (EVM_ADDRESS_REGEX.test(trimmed)) {
    return 'evm';
  }

  if (SOLANA_ADDRESS_REGEX.test(trimmed)) {
    return 'solana';
  }

  return null;
}

/**
 * Validate whether an address is a valid EVM or Solana address.
 */
export function isValidAddress(address: string): boolean {
  return detectChain(address) !== null;
}

/**
 * Check if address is a valid EVM (0x) address.
 */
export function isEvmAddress(address: string): boolean {
  return EVM_ADDRESS_REGEX.test(address.trim());
}

/**
 * Check if address is a valid Solana (base58) address.
 */
export function isSolanaAddress(address: string): boolean {
  return SOLANA_ADDRESS_REGEX.test(address.trim());
}
