"use client";

import { useState, useCallback, useEffect } from "react";
import type { TokenBalance, Wallet } from "@/types";

const CACHE_KEY = "crypto-tracker-balances";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface BalanceCache {
  data: TokenBalance[];
  timestamp: number;
}

function getCachedBalances(): BalanceCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: BalanceCache = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function cacheBalances(data: TokenBalance[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

export function useBalances() {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Load cache on client only (avoids hydration mismatch)
  useEffect(() => {
    const cached = getCachedBalances();
    if (cached) {
      setBalances(cached.data);
      setLastUpdated(cached.timestamp);
    }
  }, []);

  const fetchBalances = useCallback(async (wallets: Wallet[]) => {
    if (wallets.length === 0) {
      setBalances([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allBalances: TokenBalance[] = [];

      // Fetch balances via API routes (keys stay server-side)
      const fetches = wallets.map(async (wallet) => {
        const chains = wallet.chains.join(",");
        const res = await fetch(`/api/balances?address=${wallet.address}&chains=${chains}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.balances || []) as TokenBalance[];
      });

      const results = await Promise.all(fetches);
      results.forEach((r) => allBalances.push(...r));

      // Fetch USD prices via API route
      try {
        const tokens = allBalances
          .filter((b) => b.contractAddress)
          .map((b) => ({ chain: b.chain as string, address: b.contractAddress }));

        if (tokens.length > 0) {
          const priceRes = await fetch("/api/prices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tokens }),
          });
          if (priceRes.ok) {
            const { prices } = await priceRes.json();
            allBalances.forEach((b) => {
              const key = `${b.chain}:${b.contractAddress}`;
              if (prices[key] !== undefined) {
                b.priceUsd = prices[key];
                b.valueUsd = b.balanceFormatted * prices[key];
              }
            });
          }
        }
      } catch {
        // prices failed, continue with what we have
      }

      setBalances(allBalances);
      setLastUpdated(Date.now());
      cacheBalances(allBalances);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch balances");
    } finally {
      setLoading(false);
    }
  }, []);

  return { balances, loading, error, lastUpdated, fetchBalances };
}
