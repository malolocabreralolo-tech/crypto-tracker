"use client";

import { useEffect } from "react";
import { Clock } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { useAppContext } from "@/components/layout/AppShell";
import { useTransactions } from "@/hooks/useTransactions";

export default function HistoryPage() {
  const { wallets, selectedWallet } = useAppContext();
  const { transactions, loading, fetchTransactions } = useTransactions();

  useEffect(() => {
    if (wallets.length > 0) {
      fetchTransactions(wallets);
    }
  }, [wallets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = selectedWallet
    ? transactions.filter((tx) => tx.walletAddress === selectedWallet)
    : transactions;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Activity</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          {filtered.length > 0
            ? `${filtered.length} transaction${filtered.length !== 1 ? "s" : ""} across your wallets`
            : "Recent transactions across all your wallets"}
        </p>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[13px] text-muted-foreground animate-pulse">
              Loading transactions...
            </div>
          </div>
        ) : wallets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-14 w-14 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-[13px] text-muted-foreground">No wallets configured</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Add a wallet from the sidebar to see transaction history
            </p>
          </div>
        ) : (
          <ActivityFeed transactions={filtered} />
        )}
      </div>
    </div>
  );
}
