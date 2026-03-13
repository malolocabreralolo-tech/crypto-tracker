"use client";

import { Card } from "@/components/ui/card";
import { UsdValue } from "@/components/common/FormatValue";
import { ChainBadge } from "@/components/common/ChainBadge";
import type { Chain } from "@/types";

const CHAIN_ORDER: Chain[] = ["ethereum", "arbitrum", "optimism", "base", "polygon", "solana"];

interface ChainBreakdownProps {
  byChain: Partial<Record<Chain, number>>;
  totalValue: number;
}

export function ChainBreakdown({ byChain, totalValue }: ChainBreakdownProps) {
  const sorted = CHAIN_ORDER.filter((c) => (byChain[c] || 0) > 0);

  return (
    <Card className="p-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
        By Chain
      </h3>
      <div className="space-y-2">
        {sorted.map((chain) => {
          const value = byChain[chain] || 0;
          const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
          return (
            <div key={chain} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ChainBadge chain={chain} />
                </div>
                <div className="flex items-center gap-2">
                  <UsdValue value={value} />
                  <span className="text-muted-foreground w-12 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No data
          </p>
        )}
      </div>
    </Card>
  );
}
