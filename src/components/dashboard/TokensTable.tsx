"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TokenIcon } from "@/components/common/TokenIcon";
import { ChainBadge } from "@/components/common/ChainBadge";
import type { TokenBalance, Chain } from "@/types";

interface TokensTableProps {
  holdings: TokenBalance[];
  totalValue: number;
}

interface AggregatedToken {
  symbol: string;
  name: string;
  logo?: string;
  priceUsd: number;
  totalBalance: number;
  totalValue: number;
  change24h?: number;
  chains: { chain: Chain; balance: number; value: number }[];
  portfolioPct: number;
}

type SortKey = "value" | "price" | "balance" | "name" | "change";

export function TokensTable({ holdings, totalValue }: TokensTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortAsc, setSortAsc] = useState(false);

  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedToken>();

    for (const h of holdings) {
      if (h.valueUsd < 0.01 && h.balanceFormatted < 0.000001) continue;

      const key = h.symbol.toUpperCase();
      const existing = map.get(key);

      if (existing) {
        existing.totalBalance += h.balanceFormatted;
        existing.totalValue += h.valueUsd;
        existing.portfolioPct = totalValue > 0 ? (existing.totalValue / totalValue) * 100 : 0;
        // Use the price from the highest-value chain entry
        if (h.valueUsd > 0 && h.priceUsd > existing.priceUsd) {
          existing.priceUsd = h.priceUsd;
        }
        if (h.change24h !== undefined) {
          existing.change24h = h.change24h;
        }
        const chainEntry = existing.chains.find((c) => c.chain === h.chain);
        if (chainEntry) {
          chainEntry.balance += h.balanceFormatted;
          chainEntry.value += h.valueUsd;
        } else {
          existing.chains.push({ chain: h.chain, balance: h.balanceFormatted, value: h.valueUsd });
        }
      } else {
        map.set(key, {
          symbol: h.symbol,
          name: h.name,
          logo: h.logo,
          priceUsd: h.priceUsd,
          totalBalance: h.balanceFormatted,
          totalValue: h.valueUsd,
          change24h: h.change24h,
          chains: [{ chain: h.chain, balance: h.balanceFormatted, value: h.valueUsd }],
          portfolioPct: totalValue > 0 ? (h.valueUsd / totalValue) * 100 : 0,
        });
      }
    }

    const arr = [...map.values()].filter((t) => t.totalValue > 0.01);

    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "value":
          cmp = a.totalValue - b.totalValue;
          break;
        case "price":
          cmp = a.priceUsd - b.priceUsd;
          break;
        case "balance":
          cmp = a.totalBalance - b.totalBalance;
          break;
        case "name":
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case "change":
          cmp = (a.change24h ?? 0) - (b.change24h ?? 0);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return arr;
  }, [holdings, totalValue, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? (
      <ChevronUp className="h-3 w-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-0.5" />
    );
  };

  if (aggregated.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        No tokens found. Add a wallet to get started.
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30">
            <th className="text-left py-3 px-2 font-medium">
              <button onClick={() => handleSort("name")} className="hover:text-foreground transition-colors">
                Token <SortIcon col="name" />
              </button>
            </th>
            <th className="text-right py-3 px-2 font-medium">
              <button onClick={() => handleSort("price")} className="hover:text-foreground transition-colors">
                Price <SortIcon col="price" />
              </button>
            </th>
            <th className="text-right py-3 px-2 font-medium">
              <button onClick={() => handleSort("balance")} className="hover:text-foreground transition-colors">
                Balance <SortIcon col="balance" />
              </button>
            </th>
            <th className="text-right py-3 px-2 font-medium">
              <button onClick={() => handleSort("value")} className="hover:text-foreground transition-colors">
                Value <SortIcon col="value" />
              </button>
            </th>
            <th className="text-right py-3 px-2 font-medium w-20">
              Chain
            </th>
          </tr>
        </thead>
        <tbody>
          {aggregated.map((token) => (
            <tr
              key={token.symbol}
              className="border-b border-border/10 hover:bg-white/[0.02] transition-colors"
            >
              {/* Token */}
              <td className="py-3 px-2">
                <div className="flex items-center gap-3">
                  <TokenIcon symbol={token.symbol} logo={token.logo} size="md" />
                  <div>
                    <div className="text-[13px] font-semibold text-foreground">{token.symbol}</div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                      {token.name}
                    </div>
                  </div>
                </div>
              </td>
              {/* Price */}
              <td className="py-3 px-2 text-right">
                <span className="text-[13px] tabular-nums text-foreground/80">
                  {token.priceUsd >= 1
                    ? `$${token.priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : token.priceUsd >= 0.01
                      ? `$${token.priceUsd.toFixed(4)}`
                      : `$${token.priceUsd.toFixed(6)}`}
                </span>
                {token.change24h !== undefined && (
                  <div
                    className={cn(
                      "text-[10px] tabular-nums mt-0.5",
                      token.change24h >= 0
                        ? "text-[var(--color-gain)]"
                        : "text-[var(--color-loss)]"
                    )}
                  >
                    {token.change24h >= 0 ? "+" : ""}
                    {token.change24h.toFixed(2)}%
                  </div>
                )}
              </td>
              {/* Balance */}
              <td className="py-3 px-2 text-right">
                <span className="text-[13px] tabular-nums text-foreground/70">
                  {token.totalBalance < 0.01
                    ? token.totalBalance.toFixed(6)
                    : token.totalBalance < 1
                      ? token.totalBalance.toFixed(4)
                      : token.totalBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </span>
              </td>
              {/* Value */}
              <td className="py-3 px-2 text-right">
                <div className="text-[13px] font-semibold tabular-nums text-foreground">
                  ${token.totalValue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                  {token.portfolioPct.toFixed(1)}%
                </div>
              </td>
              {/* Chain badges */}
              <td className="py-3 px-2 text-right">
                <div className="flex gap-1 justify-end flex-wrap">
                  {token.chains
                    .sort((a, b) => b.value - a.value)
                    .map((c) => (
                      <ChainBadge key={c.chain} chain={c.chain} />
                    ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
