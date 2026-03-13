"use client";

import { useState, useCallback } from "react";
import type { Wallet } from "@/types";
import type { HyperliquidPerpPosition } from "@/lib/providers/hyperliquid";

export interface HyperliquidData {
  accountValue: number;
  totalMarginUsed: number;
  totalNotional: number;
  withdrawable: number;
  positions: HyperliquidPerpPosition[];
  walletAddress: string;
}

export function useHyperliquid() {
  const [data, setData] = useState<HyperliquidData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHyperliquid = useCallback(async (wallets: Wallet[]) => {
    const hlWallets = wallets.filter((w) => w.chains.includes("hyperliquid"));
    if (hlWallets.length === 0) {
      setData([]);
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.all(
        hlWallets.map(async (w) => {
          const res = await fetch(`/api/hyperliquid?address=${w.address}`);
          if (!res.ok) return null;
          const account = await res.json();
          return { ...account, walletAddress: w.address } as HyperliquidData;
        })
      );
      setData(results.filter(Boolean) as HyperliquidData[]);
    } catch (error) {
      console.error("[useHyperliquid]", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, fetchHyperliquid };
}
