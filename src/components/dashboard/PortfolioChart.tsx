"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import type { PortfolioSnapshot } from "@/types";

type Period = "24H" | "1W" | "1M" | "3M" | "1Y" | "ALL";

interface PortfolioChartProps {
  history: PortfolioSnapshot[];
}

const periodMs: Record<Period, number> = {
  "24H": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "3M": 90 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
  ALL: Infinity,
};

export function PortfolioChart({ history }: PortfolioChartProps) {
  const [period, setPeriod] = useState<Period>("1M");

  const now = Date.now();
  const filtered =
    period === "ALL"
      ? history
      : history.filter((s) => now - s.timestamp < periodMs[period]);

  // If only 1 snapshot, duplicate to draw a flat line
  let chartSnapshots = filtered;
  if (filtered.length === 1) {
    const s = filtered[0];
    chartSnapshots = [{ ...s, timestamp: s.timestamp - 3600000 }, s];
  }

  const data = chartSnapshots.map((s) => ({
    date: new Date(s.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(period === "24H" ? { hour: "numeric", minute: "2-digit" } : {}),
    }),
    value: s.totalValueUsd,
    timestamp: s.timestamp,
  }));

  const first = data[0]?.value ?? 0;
  const last = data[data.length - 1]?.value ?? 0;
  const changeAmt = last - first;
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
  const isUp = changeAmt >= 0;

  const gradientId = `chart-gradient-${isUp ? "up" : "down"}`;

  return (
    <div>
      {/* Period change info */}
      {data.length >= 2 && filtered.length >= 2 && (
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              isUp ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]"
            )}
          >
            {isUp ? "+" : ""}${Math.abs(changeAmt).toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </span>
          <span
            className={cn(
              "text-xs font-medium tabular-nums px-1.5 py-0.5 rounded",
              isUp
                ? "text-[var(--color-gain)] bg-[var(--color-gain-bg)]"
                : "text-[var(--color-loss)] bg-[var(--color-loss-bg)]"
            )}
          >
            {isUp ? "+" : ""}{changePct.toFixed(2)}%
          </span>
          <span className="text-[11px] text-muted-foreground">
            {period}
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="relative">
        {data.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            Add a wallet to start tracking your portfolio
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isUp ? "var(--color-gain)" : "var(--color-loss)"}
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="100%"
                    stopColor={isUp ? "var(--color-gain)" : "var(--color-loss)"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "oklch(0.5 0.01 250)" }}
                axisLine={false}
                tickLine={false}
                dy={8}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "oklch(0.5 0.01 250)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1_000_000
                    ? `$${(v / 1_000_000).toFixed(1)}M`
                    : v >= 1_000
                      ? `$${(v / 1_000).toFixed(0)}K`
                      : `$${v.toFixed(0)}`
                }
                width={55}
                dx={-4}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.12 0.005 250)",
                  border: "1px solid oklch(0.22 0.01 250)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  padding: "8px 12px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
                formatter={(value) => [
                  `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
                  "Value",
                ]}
                labelStyle={{ color: "oklch(0.5 0.01 250)", fontSize: "10px", marginBottom: "4px" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isUp ? "var(--color-gain)" : "var(--color-loss)"}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Period selector */}
      <div className="flex gap-1 mt-4 justify-center">
        {(["24H", "1W", "1M", "3M", "1Y", "ALL"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
              period === p
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
