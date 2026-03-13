"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsdValue } from "@/components/common/FormatValue";

interface PortfolioSummaryProps {
  totalValue: number;
  lastUpdated: number | null;
  loading: boolean;
  onRefresh: () => void;
}

export function PortfolioSummary({
  totalValue,
  lastUpdated,
  loading,
  onRefresh,
}: PortfolioSummaryProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Portfolio Value
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums text-primary">
            <UsdValue value={totalValue} />
          </span>
        </div>
        {lastUpdated && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="gap-1.5"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Loading..." : "Refresh"}
      </Button>
    </div>
  );
}
