import type { Chain, Wallet } from '@/types';

const STORAGE_KEY = 'crypto-tracker-wallets';

function readWallets(): Wallet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Wallet[];
  } catch {
    return [];
  }
}

function writeWallets(wallets: Wallet[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
}

/**
 * Get all saved wallets.
 */
export function getWallets(): Wallet[] {
  return readWallets();
}

/**
 * Get a single wallet by ID.
 */
export function getWallet(id: string): Wallet | undefined {
  return readWallets().find((w) => w.id === id);
}

/**
 * Add a new wallet. Returns the created wallet.
 * Throws if address already exists.
 */
export function addWallet(
  address: string,
  label: string,
  chains: Chain[]
): Wallet {
  const wallets = readWallets();
  const normalized = address.trim();

  const existing = wallets.find(
    (w) => w.address.toLowerCase() === normalized.toLowerCase()
  );
  if (existing) {
    throw new Error(`Wallet with address ${normalized} already exists`);
  }

  const wallet: Wallet = {
    id: crypto.randomUUID(),
    address: normalized,
    label: label.trim() || shortenForLabel(normalized),
    chains,
    addedAt: Date.now(),
  };

  wallets.push(wallet);
  writeWallets(wallets);
  return wallet;
}

/**
 * Remove a wallet by ID.
 */
export function removeWallet(id: string): void {
  const wallets = readWallets();
  const filtered = wallets.filter((w) => w.id !== id);
  writeWallets(filtered);
}

/**
 * Update a wallet's label.
 */
export function updateWalletLabel(id: string, label: string): void {
  const wallets = readWallets();
  const wallet = wallets.find((w) => w.id === id);
  if (!wallet) {
    throw new Error(`Wallet with id ${id} not found`);
  }
  wallet.label = label.trim();
  writeWallets(wallets);
}

function shortenForLabel(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
