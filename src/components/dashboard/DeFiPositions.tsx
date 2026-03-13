"use client";

import { Card } from "@/components/ui/card";
import { ChainBadge } from "@/components/common/ChainBadge";
import { UsdValue } from "@/components/common/FormatValue";
import type { DeFiPosition } from "@/types";

const typeColors: Record<DeFiPosition["type"], string> = {
  staking: "bg-green-500/20 text-green-400",
  lending: "bg-blue-500/20 text-blue-400",
  liquidity: "bg-purple-500/20 text-purple-400",
};

interface DeFiPositionsProps {
  positions: DeFiPosition[];
}

export function DeFiPositions({ positions }: DeFiPositionsProps) {
  const totalDefi = positions.reduce((sum, p) => sum + p.totalValueUsd, 0);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          DeFi Positions
        </h3>
        {totalDefi > 0 && (
          <UsdValue value={totalDefi} className="text-xs font-bold text-primary" />
        )}
      </div>
      <div className="space-y-2">
        {positions.map((p, i) => (
          <div
            key={`${p.protocol}-${p.chain}-${i}`}
            className="flex items-center justify-between p-2 rounded bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium capitalize">{p.protocol}</span>
                  <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${typeColors[p.type]}`}>
                    {p.type.toUpperCase()}
                  </span>
                  <ChainBadge chain={p.chain} />
                </div>
                <div className="flex gap-1 mt-0.5">
                  {p.tokens.map((t, j) => (
                    <span key={j} className="text-[10px] text-muted-foreground">
                      {t.amount.toFixed(4)} {t.symbol}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <UsdValue value={p.totalValueUsd} className="text-xs font-medium" />
              {p.apy && (
                <p className="text-[10px] text-green-400">{p.apy.toFixed(1)}% APY</p>
              )}
            </div>
          </div>
        ))}
        {positions.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No DeFi positions found
          </p>
        )}
      </div>
    </Card>
  );
}
