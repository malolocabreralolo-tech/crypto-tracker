"use client";

import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { TopHoldings } from "@/components/dashboard/TopHoldings";
import { ChainBreakdown } from "@/components/dashboard/ChainBreakdown";
import { DeFiPositions } from "@/components/dashboard/DeFiPositions";
import { WalletManager } from "@/components/wallet/WalletManager";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  const {
    totalValue,
    byChain,
    byWallet,
    topHoldings,
    positions,
    history,
    loading,
    error,
    lastUpdated,
    refresh,
  } = usePortfolio();

  return (
    <div className="space-y-4 max-w-[1400px]">
      <PortfolioSummary
        totalValue={totalValue}
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={refresh}
      />

      {error && (
        <Card className="p-3 border-destructive/50 bg-destructive/10">
          <p className="text-xs text-destructive">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <PortfolioChart history={history} />
          <TopHoldings holdings={topHoldings} totalValue={totalValue} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <ChainBreakdown byChain={byChain} totalValue={totalValue} />
          <DeFiPositions positions={positions} />
          <Card className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Wallets
            </h3>
            <WalletManager walletValues={byWallet} />
          </Card>
        </div>
      </div>
    </div>
  );
}
