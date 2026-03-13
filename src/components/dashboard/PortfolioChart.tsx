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
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PortfolioSnapshot } from "@/types";

type Period = "7d" | "30d" | "90d" | "all";

interface PortfolioChartProps {
  history: PortfolioSnapshot[];
}

export function PortfolioChart({ history }: PortfolioChartProps) {
  const [period, setPeriod] = useState<Period>("30d");

  const now = Date.now();
  const periodMs: Record<Period, number> = {
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
    all: Infinity,
  };

  const filtered =
    period === "all"
      ? history
      : history.filter((s) => now - s.timestamp < periodMs[period]);

  const data = filtered.map((s) => ({
    date: new Date(s.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    value: s.totalValueUsd,
    timestamp: s.timestamp,
  }));

  const first = data[0]?.value ?? 0;
  const last = data[data.length - 1]?.value ?? 0;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;
  const isUp = change >= 0;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Portfolio Evolution
        </h3>
        <div className="flex gap-1">
          {(["7d", "30d", "90d", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {data.length < 2 ? (
        <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
          Need more snapshots to show chart. Refresh periodically to build history.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isUp ? "var(--color-gain)" : "var(--color-loss)"}
                  stopOpacity={0.3}
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
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1000000
                  ? `$${(v / 1000000).toFixed(1)}M`
                  : v >= 1000
                    ? `$${(v / 1000).toFixed(0)}K`
                    : `$${v.toFixed(0)}`
              }
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: "oklch(0.15 0.005 250)",
                border: "1px solid oklch(0.25 0.01 250)",
                borderRadius: "6px",
                fontSize: "11px",
              }}
              formatter={(value) => [
                `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
                "Value",
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isUp ? "var(--color-gain)" : "var(--color-loss)"}
              strokeWidth={2}
              fill="url(#portfolioGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
