"use client";

import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Shield, Layers, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChainBadge } from "@/components/common/ChainBadge";
import type { Transaction } from "@/types";

interface ActivityFeedProps {
  transactions: Transaction[];
}

const typeConfig: Record<
  Transaction["type"],
  { icon: typeof ArrowUpRight; label: string; color: string }
> = {
  transfer: { icon: ArrowUpRight, label: "Transfer", color: "text-blue-400" },
  swap: { icon: ArrowLeftRight, label: "Swap", color: "text-purple-400" },
  bridge: { icon: Layers, label: "Bridge", color: "text-cyan-400" },
  stake: { icon: Zap, label: "Stake", color: "text-green-400" },
  unstake: { icon: Zap, label: "Unstake", color: "text-orange-400" },
  approve: { icon: Shield, label: "Approve", color: "text-yellow-400" },
  other: { icon: ArrowDownLeft, label: "Transaction", color: "text-muted-foreground" },
};

function abbrevAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ActivityFeed({ transactions }: ActivityFeedProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-white/[0.03] flex items-center justify-center mb-3">
          <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No recent activity</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          Transactions will appear here once detected
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx, i) => {
        const config = typeConfig[tx.type];
        const Icon = config.icon;

        return (
          <div
            key={`${tx.hash}-${i}`}
            className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.02] transition-colors"
          >
            {/* Icon */}
            <div
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                "bg-white/[0.04]"
              )}
            >
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground">
                  {config.label}
                </span>
                <ChainBadge chain={tx.chain} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-muted-foreground font-mono">
                  {abbrevAddr(tx.hash)}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="text-right shrink-0">
              {tx.tokenIn && (
                <div className="text-[12px] tabular-nums text-foreground">
                  {tx.type === "swap" ? "-" : ""}
                  {tx.tokenIn.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}{" "}
                  <span className="text-muted-foreground">{tx.tokenIn.symbol}</span>
                </div>
              )}
              {tx.tokenOut && (
                <div className="text-[12px] tabular-nums text-[var(--color-gain)]">
                  +{tx.tokenOut.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}{" "}
                  <span className="text-[var(--color-gain)]/70">{tx.tokenOut.symbol}</span>
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {formatTimeAgo(tx.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
