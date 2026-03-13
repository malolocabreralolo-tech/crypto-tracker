"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
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
  const totalMarginUsed = accounts.reduce((s, a) => s + a.totalMarginUsed, 0);
  const freeMargin = totalAccountValue - totalMarginUsed;

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

  // PnL chart data (sorted by absolute PnL)
  const pnlData = allPositions
    .filter((p) => Math.abs(p.unrealizedPnl) > 0.01)
    .sort((a, b) => b.unrealizedPnl - a.unrealizedPnl)
    .map((p) => ({
      coin: p.coin,
      pnl: p.unrealizedPnl,
      roe: p.returnOnEquity * 100,
      side: p.side,
    }));

  // Account breakdown for pie chart
  const pieData = [
    ...(freeMargin > 0 ? [{ name: "Free Margin", value: freeMargin, color: "oklch(0.5 0.01 250)" }] : []),
    ...allPositions
      .filter((p) => p.marginUsed > 0.01)
      .sort((a, b) => b.marginUsed - a.marginUsed)
      .map((p) => ({
        name: `${p.coin} ${p.side.toUpperCase()}`,
        value: p.marginUsed,
        color: p.unrealizedPnl >= 0 ? "#00c853" : "#ff1744",
      })),
  ];

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
          value={`$${totalMarginUsed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
      </div>

      {/* Charts row */}
      {(pnlData.length > 0 || pieData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* PnL Bar Chart */}
          {pnlData.length > 0 && (
            <div className="rounded-xl bg-white/[0.02] border border-border/20 p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                PnL by Position
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pnlData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <XAxis
                    dataKey="coin"
                    tick={{ fontSize: 10, fill: "oklch(0.5 0.01 250)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "oklch(0.5 0.01 250)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(0)}K` :
                      v <= -1000 ? `-$${(Math.abs(v) / 1000).toFixed(0)}K` :
                      `$${v.toFixed(0)}`
                    }
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.12 0.005 250)",
                      border: "1px solid oklch(0.22 0.01 250)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [
                      `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                      "PnL",
                    ]}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {pnlData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.pnl >= 0 ? "#00c853" : "#ff1744"}
                        fillOpacity={0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Account Breakdown Donut */}
          {pieData.length > 0 && (
            <div className="rounded-xl bg-white/[0.02] border border-border/20 p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Account Breakdown
              </h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.12 0.005 250)",
                        border: "1px solid oklch(0.22 0.01 250)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        padding: "6px 10px",
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => [
                        `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 min-w-0">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: d.color, opacity: 0.8 }}
                        />
                        <span className="text-muted-foreground truncate">{d.name}</span>
                      </div>
                      <span className="tabular-nums text-foreground/80 shrink-0">
                        ${d.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Funding summary */}
      {allPositions.some((p) => Math.abs(p.funding.allTime) > 0.01) && (
        <div className="rounded-xl bg-white/[0.02] border border-border/20 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Cumulative Funding
          </h3>
          <div className="space-y-2">
            {allPositions
              .filter((p) => Math.abs(p.funding.allTime) > 0.01)
              .sort((a, b) => Math.abs(b.funding.allTime) - Math.abs(a.funding.allTime))
              .map((p, i) => {
                const isPositive = p.funding.allTime >= 0;
                return (
                  <div
                    key={`funding-${p.coin}-${i}`}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-[12px] text-foreground/80">{p.coin}-PERP</span>
                    <span
                      className={cn(
                        "text-[12px] tabular-nums font-medium",
                        isPositive ? "text-[var(--color-loss)]" : "text-[var(--color-gain)]"
                      )}
                    >
                      {isPositive ? "-" : "+"}${Math.abs(p.funding.allTime).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                );
              })}
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
