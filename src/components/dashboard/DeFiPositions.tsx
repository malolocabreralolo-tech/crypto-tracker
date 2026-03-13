"use client";

import { cn } from "@/lib/utils";
import { ChainBadge } from "@/components/common/ChainBadge";
import type { DeFiPosition } from "@/types";
import { Layers, TrendingUp, Droplets } from "lucide-react";

const typeConfig: Record<
  DeFiPosition["type"],
  { icon: typeof Layers; color: string; bgColor: string }
> = {
  staking: {
    icon: TrendingUp,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  lending: {
    icon: Layers,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  liquidity: {
    icon: Droplets,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
};

interface DeFiPositionsProps {
  positions: DeFiPosition[];
}

export function DeFiPositions({ positions }: DeFiPositionsProps) {
  const totalDefi = positions.reduce((sum, p) => sum + p.totalValueUsd, 0);

  // Group by protocol
  const byProtocol = new Map<string, DeFiPosition[]>();
  for (const p of positions) {
    const key = p.protocol;
    const existing = byProtocol.get(key) || [];
    existing.push(p);
    byProtocol.set(key, existing);
  }

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-white/[0.03] flex items-center justify-center mb-3">
          <Layers className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No DeFi positions</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          Staking, lending and LP positions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total DeFi header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-muted-foreground">
          {positions.length} position{positions.length !== 1 ? "s" : ""} across{" "}
          {byProtocol.size} protocol{byProtocol.size !== 1 ? "s" : ""}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          ${totalDefi.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Grouped by protocol */}
      {[...byProtocol.entries()].map(([protocol, protocolPositions]) => {
        const protocolValue = protocolPositions.reduce((s, p) => s + p.totalValueUsd, 0);

        return (
          <div key={protocol} className="rounded-xl bg-white/[0.02] border border-border/20 overflow-hidden">
            {/* Protocol header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/10">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-white/[0.06] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-foreground/70">
                    {protocol.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className="text-[13px] font-semibold capitalize text-foreground">
                  {protocol}
                </span>
              </div>
              <span className="text-[13px] font-semibold tabular-nums text-foreground">
                ${protocolValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Positions */}
            <div className="divide-y divide-border/10">
              {protocolPositions.map((p, i) => {
                const config = typeConfig[p.type];
                const Icon = config.icon;

                return (
                  <div key={`${protocol}-${p.chain}-${i}`} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1 rounded", config.bgColor)}>
                          <Icon className={cn("h-3.5 w-3.5", config.color)} />
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            config.color
                          )}
                        >
                          {p.type}
                        </span>
                        <ChainBadge chain={p.chain} />
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-medium tabular-nums text-foreground">
                          ${p.totalValueUsd.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        {p.apy && (
                          <span className="text-[10px] text-[var(--color-gain)] ml-2">
                            {p.apy.toFixed(1)}% APY
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Token breakdown */}
                    <div className="flex gap-3 mt-2 ml-7">
                      {p.tokens.map((t, j) => (
                        <span key={j} className="text-[11px] text-muted-foreground tabular-nums">
                          {t.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}{" "}
                          <span className="text-foreground/50">{t.symbol}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
