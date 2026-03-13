"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import type { HyperliquidData } from "@/hooks/useHyperliquid";

interface HyperliquidPositionsProps {
  accounts: HyperliquidData[];
}

export function HyperliquidPositions({ accounts }: HyperliquidPositionsProps) {
  const allPositions = accounts.flatMap((a) =>
    a.positions.map((p) => ({ ...p, walletAddress: a.walletAddress }))
  );
  const totalAccountValue = accounts.reduce((s, a) => s + a.accountValue, 0);
  const totalPnl = allPositions.reduce((s, p) => s + p.unrealizedPnl, 0);

  if (accounts.length === 0 || (allPositions.length === 0 && totalAccountValue < 0.01)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
          <DollarSign className="h-5 w-5 text-emerald-400" />
        </div>
        <p className="text-sm text-muted-foreground">No Hyperliquid positions</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          Add a wallet with Hyperliquid enabled to see perp positions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Account summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Account Value"
          value={`$${totalAccountValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <SummaryCard
          label="Open Positions"
          value={String(allPositions.length)}
        />
        <SummaryCard
          label="Unrealized PnL"
          value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color={totalPnl >= 0 ? "gain" : "loss"}
        />
        <SummaryCard
          label="Margin Used"
          value={`$${accounts.reduce((s, a) => s + a.totalMarginUsed, 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
      </div>

      {/* Positions table */}
      {allPositions.length > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-border/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/10">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <span className="text-[10px] font-bold text-emerald-400">HL</span>
              </div>
              <span className="text-[13px] font-semibold text-foreground">Perpetual Positions</span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/10">
                  <th className="text-left py-2.5 px-4 font-medium">Market</th>
                  <th className="text-right py-2.5 px-2 font-medium">Side</th>
                  <th className="text-right py-2.5 px-2 font-medium">Size</th>
                  <th className="text-right py-2.5 px-2 font-medium">Entry</th>
                  <th className="text-right py-2.5 px-2 font-medium">Value</th>
                  <th className="text-right py-2.5 px-2 font-medium">PnL</th>
                  <th className="text-right py-2.5 px-2 font-medium">ROE</th>
                  <th className="text-right py-2.5 px-4 font-medium">Liq. Price</th>
                </tr>
              </thead>
              <tbody>
                {allPositions
                  .sort((a, b) => Math.abs(b.positionValue) - Math.abs(a.positionValue))
                  .map((p, i) => {
                    const isLong = p.side === "long";
                    const pnlPositive = p.unrealizedPnl >= 0;

                    return (
                      <tr
                        key={`${p.coin}-${i}`}
                        className="border-b border-border/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-emerald-400">
                                {p.coin.slice(0, 3)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[13px] font-semibold text-foreground">
                                {p.coin}-PERP
                              </span>
                              <div className="text-[10px] text-muted-foreground">
                                {p.leverage}x {p.leverageType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded",
                              isLong
                                ? "text-[var(--color-gain)] bg-[var(--color-gain-bg)]"
                                : "text-[var(--color-loss)] bg-[var(--color-loss-bg)]"
                            )}
                          >
                            {isLong ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {isLong ? "LONG" : "SHORT"}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="text-[13px] tabular-nums text-foreground/80">
                            {p.size.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="text-[13px] tabular-nums text-foreground/80">
                            ${p.entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="text-[13px] tabular-nums font-semibold text-foreground">
                            ${p.positionValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span
                            className={cn(
                              "text-[13px] tabular-nums font-semibold",
                              pnlPositive ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]"
                            )}
                          >
                            {pnlPositive ? "+" : ""}
                            ${p.unrealizedPnl.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span
                            className={cn(
                              "text-[12px] tabular-nums",
                              pnlPositive ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]"
                            )}
                          >
                            {pnlPositive ? "+" : ""}
                            {(p.returnOnEquity * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-[12px] tabular-nums text-muted-foreground">
                            {p.liquidationPrice
                              ? `$${p.liquidationPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                              : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "gain" | "loss";
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-border/20 p-3">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      <p
        className={cn(
          "text-sm font-bold tabular-nums mt-1",
          color === "gain"
            ? "text-[var(--color-gain)]"
            : color === "loss"
              ? "text-[var(--color-loss)]"
              : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
