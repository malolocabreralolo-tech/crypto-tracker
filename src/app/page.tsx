"use client";

import { useState, useMemo } from "react";
import { NetWorth } from "@/components/dashboard/NetWorth";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { TokensTable } from "@/components/dashboard/TokensTable";
import { DeFiPositions } from "@/components/dashboard/DeFiPositions";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { useAppContext } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";
import { Coins, Layers, Clock } from "lucide-react";

type Tab = "tokens" | "defi" | "activity";

export default function DashboardPage() {
  const {
    totalValue,
    topHoldings,
    positions,
    transactions,
    history,
    loading,
    error,
    lastUpdated,
    refresh,
    selectedWallet,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<Tab>("tokens");

  // Filter data by selected wallet
  const filteredHoldings = useMemo(
    () =>
      selectedWallet
        ? topHoldings.filter(
            (h) => h.walletAddress.toLowerCase() === selectedWallet.toLowerCase()
          )
        : topHoldings,
    [topHoldings, selectedWallet]
  );

  const filteredPositions = useMemo(
    () =>
      selectedWallet
        ? positions.filter(
            (p) => p.walletAddress.toLowerCase() === selectedWallet.toLowerCase()
          )
        : positions,
    [positions, selectedWallet]
  );

  const filteredTransactions = useMemo(
    () =>
      selectedWallet
        ? transactions.filter(
            (t) => t.walletAddress.toLowerCase() === selectedWallet.toLowerCase()
          )
        : transactions,
    [transactions, selectedWallet]
  );

  const filteredTotalValue = useMemo(
    () =>
      selectedWallet
        ? filteredHoldings.reduce((s, h) => s + h.valueUsd, 0) +
          filteredPositions.reduce((s, p) => s + p.totalValueUsd, 0)
        : totalValue,
    [selectedWallet, filteredHoldings, filteredPositions, totalValue]
  );

  // Calculate 24h change from history
  const { change24h, changePct24h } = useMemo(() => {
    if (history.length < 2) return { change24h: 0, changePct24h: 0 };
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const oldSnapshot = history.reduce((closest, s) => {
      if (
        Math.abs(s.timestamp - dayAgo) <
        Math.abs(closest.timestamp - dayAgo)
      ) {
        return s;
      }
      return closest;
    }, history[0]);

    const currentVal = selectedWallet ? filteredTotalValue : totalValue;
    const oldValue = oldSnapshot.totalValueUsd;
    // For selected wallet, we don't have per-wallet history, so show overall
    const changeAmt = selectedWallet ? 0 : currentVal - oldValue;
    const changePct = oldValue > 0 ? (changeAmt / oldValue) * 100 : 0;
    return { change24h: changeAmt, changePct24h: changePct };
  }, [history, totalValue, filteredTotalValue, selectedWallet]);

  const tabs: { id: Tab; label: string; icon: typeof Coins; count?: number }[] = [
    {
      id: "tokens",
      label: "Tokens",
      icon: Coins,
      count: filteredHoldings.filter((h) => h.valueUsd > 0.01).length,
    },
    { id: "defi", label: "DeFi", icon: Layers, count: filteredPositions.length },
    { id: "activity", label: "Activity", icon: Clock, count: filteredTransactions.length },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Error banner */}
      {error && (
        <div className="px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-[12px] text-destructive">{error}</p>
        </div>
      )}

      {/* Net Worth Header */}
      <NetWorth
        totalValue={filteredTotalValue}
        change24h={change24h}
        changePct24h={changePct24h}
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={refresh}
      />

      {/* Portfolio Chart */}
      {!selectedWallet && <PortfolioChart history={history} />}

      {/* Tabs */}
      <div className="border-b border-border/20">
        <div className="flex gap-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-[13px] font-medium transition-all relative",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/70"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "bg-white/[0.05] text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-8">
        {activeTab === "tokens" && (
          <TokensTable holdings={filteredHoldings} totalValue={filteredTotalValue} />
        )}
        {activeTab === "defi" && <DeFiPositions positions={filteredPositions} />}
        {activeTab === "activity" && <ActivityFeed transactions={filteredTransactions} />}
      </div>
    </div>
  );
}
