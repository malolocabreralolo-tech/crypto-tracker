"use client";

import { useState, useEffect, useCallback } from "react";
import type { Chain, Wallet } from "@/types";

const STORAGE_KEY = "crypto-tracker-wallets";

function loadWallets(): Wallet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWallets(wallets: Wallet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
}

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setWallets(loadWallets());
    setLoaded(true);
  }, []);

  const persist = useCallback((updated: Wallet[]) => {
    setWallets(updated);
    saveWallets(updated);
  }, []);

  const addWallet = useCallback(
    (address: string, label: string, chains: Chain[]) => {
      const existing = wallets.find(
        (w) => w.address.toLowerCase() === address.toLowerCase()
      );
      if (existing) return;

      const wallet: Wallet = {
        id: crypto.randomUUID(),
        address,
        label,
        chains,
        addedAt: Date.now(),
      };
      persist([...wallets, wallet]);
    },
    [wallets, persist]
  );

  const removeWallet = useCallback(
    (id: string) => {
      persist(wallets.filter((w) => w.id !== id));
    },
    [wallets, persist]
  );

  const updateLabel = useCallback(
    (id: string, label: string) => {
      persist(wallets.map((w) => (w.id === id ? { ...w, label } : w)));
    },
    [wallets, persist]
  );

  return { wallets, loaded, addWallet, removeWallet, updateLabel };
}
