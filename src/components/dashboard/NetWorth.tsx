"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetWorthProps {
  totalValue: number;
  change24h: number;
  changePct24h: number;
  lastUpdated: number | null;
  loading: boolean;
  onRefresh: () => void;
}

export function NetWorth({
  totalValue,
  change24h,
  changePct24h,
  lastUpdated,
  loading,
  onRefresh,
}: NetWorthProps) {
  const isUp = change24h >= 0;

  const timeAgo = lastUpdated
    ? (() => {
        const mins = Math.floor((Date.now() - lastUpdated) / 60000);
        if (mins < 1) return "just now";
        if (mins === 1) return "1 min ago";
        if (mins < 60) return `${mins} min ago`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ago`;
      })()
    : null;

  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
            ${totalValue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h1>
          {totalValue > 0 && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  isUp ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]"
                )}
              >
                {isUp ? "+" : ""}
                ${Math.abs(change24h).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className={cn(
                  "text-xs font-medium tabular-nums px-1.5 py-0.5 rounded",
                  isUp
                    ? "text-[var(--color-gain)] bg-[var(--color-gain-bg)]"
                    : "text-[var(--color-loss)] bg-[var(--color-loss-bg)]"
                )}
              >
                {isUp ? "+" : ""}
                {changePct24h.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        {timeAgo && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Updated {timeAgo}
          </p>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-all disabled:opacity-50"
      >
        <RefreshCw
          className={cn("h-4 w-4", loading && "animate-spin")}
        />
      </button>
    </div>
  );
}
