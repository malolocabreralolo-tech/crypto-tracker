"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useWallets } from "./useWallets";
import { useBalances } from "./useBalances";
import { useDeFiPositions } from "./useDeFiPositions";
import { useTransactions } from "./useTransactions";
import type { Chain, PortfolioSnapshot } from "@/types";

const HISTORY_KEY = "crypto-tracker-portfolio-history";

function loadHistory(): PortfolioSnapshot[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: PortfolioSnapshot[]) {
  // Keep max 365 snapshots
  const trimmed = history.slice(-365);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function usePortfolio() {
  const { wallets, loaded } = useWallets();
  const { balances, loading: balancesLoading, error: balancesError, lastUpdated, fetchBalances } = useBalances();
  const { positions, loading: defiLoading, fetchPositions } = useDeFiPositions();
  const { transactions, loading: txLoading, fetchTransactions } = useTransactions();
  const [history, setHistory] = useState<PortfolioSnapshot[]>([]);
  const historyLoadedRef = useRef(false);

  // Load history from localStorage on client only (avoids hydration mismatch)
  useEffect(() => {
    if (!historyLoadedRef.current) {
      historyLoadedRef.current = true;
      setHistory(loadHistory());
    }
  }, []);
  const hasFetchedRef = useRef(false);

  const loading = balancesLoading || defiLoading || txLoading;

  // Total portfolio value
  const totalValue = balances.reduce((sum, b) => sum + b.valueUsd, 0)
    + positions.reduce((sum, p) => sum + p.totalValueUsd, 0);

  // Value per chain
  const byChain: Partial<Record<Chain, number>> = {};
  for (const b of balances) {
    byChain[b.chain] = (byChain[b.chain] || 0) + b.valueUsd;
  }
  for (const p of positions) {
    byChain[p.chain] = (byChain[p.chain] || 0) + p.totalValueUsd;
  }

  // Value per wallet
  const byWallet: Record<string, number> = {};
  for (const b of balances) {
    byWallet[b.walletAddress] = (byWallet[b.walletAddress] || 0) + b.valueUsd;
  }
  for (const p of positions) {
    byWallet[p.walletAddress] = (byWallet[p.walletAddress] || 0) + p.totalValueUsd;
  }

  // Top holdings (sorted by value)
  const topHoldings = [...balances].sort((a, b) => b.valueUsd - a.valueUsd);

  const refresh = useCallback(async () => {
    if (wallets.length === 0) return;
    await Promise.all([
      fetchBalances(wallets),
      fetchPositions(wallets),
      fetchTransactions(wallets),
    ]);
  }, [wallets, fetchBalances, fetchPositions, fetchTransactions]);

  // Auto-fetch on wallet change — use wallets directly, not refresh
  useEffect(() => {
    if (loaded && wallets.length > 0) {
      // Prevent double-fetch on mount with cached data
      if (hasFetchedRef.current && balances.length > 0) return;
      hasFetchedRef.current = true;
      Promise.all([
        fetchBalances(wallets),
        fetchPositions(wallets),
        fetchTransactions(wallets),
      ]);
    }
  }, [loaded, wallets, fetchBalances, fetchPositions, fetchTransactions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save snapshot when value changes — at most one per 5 minutes
  useEffect(() => {
    if (totalValue > 1 && lastUpdated) {
      const lastSnapshot = history[history.length - 1];
      const minInterval = 5 * 60 * 1000; // 5 minutes
      if (lastSnapshot && lastUpdated - lastSnapshot.timestamp < minInterval) return;

      const snapshot: PortfolioSnapshot = {
        timestamp: lastUpdated,
        totalValueUsd: totalValue,
        byChain: byChain as Record<Chain, number>,
      };
      const updated = [...history, snapshot];
      setHistory(updated);
      saveHistory(updated);
    }
  }, [totalValue, lastUpdated]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    wallets,
    balances,
    positions,
    transactions,
    totalValue,
    byChain,
    byWallet,
    topHoldings,
    history,
    loading,
    error: balancesError,
    lastUpdated,
    refresh,
  };
}
