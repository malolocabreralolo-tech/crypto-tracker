"use client";

import { useState, useCallback } from "react";
import type { DeFiPosition, Wallet } from "@/types";

export function useDeFiPositions() {
  const [positions, setPositions] = useState<DeFiPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async (wallets: Wallet[]) => {
    if (wallets.length === 0) {
      setPositions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allPositions: DeFiPosition[] = [];

      const fetches = wallets.map(async (wallet) => {
        const chains = wallet.chains.join(",");
        const res = await fetch(`/api/defi?address=${wallet.address}&chains=${chains}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.positions || []) as DeFiPosition[];
      });

      const results = await Promise.all(fetches);
      results.forEach((r) => allPositions.push(...r));

      allPositions.sort((a, b) => b.totalValueUsd - a.totalValueUsd);
      setPositions(allPositions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch DeFi positions");
    } finally {
      setLoading(false);
    }
  }, []);

  return { positions, loading, error, fetchPositions };
}
