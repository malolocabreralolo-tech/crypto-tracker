"use client";

import { useState, useCallback } from "react";
import type { Transaction, Wallet } from "@/types";

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (wallets: Wallet[]) => {
    if (wallets.length === 0) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allTxs: Transaction[] = [];

      const fetches = wallets.map(async (wallet) => {
        const chains = wallet.chains.join(",");
        const res = await fetch(`/api/transactions?address=${wallet.address}&chains=${chains}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.transactions || []) as Transaction[];
      });

      const results = await Promise.all(fetches);
      results.forEach((r) => allTxs.push(...r));

      allTxs.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(allTxs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  return { transactions, loading, error, fetchTransactions };
}
