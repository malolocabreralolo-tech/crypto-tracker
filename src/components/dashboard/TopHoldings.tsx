"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TokenIcon } from "@/components/common/TokenIcon";
import { ChainBadge } from "@/components/common/ChainBadge";
import { UsdValue, CryptoValue, PercentChange } from "@/components/common/FormatValue";
import type { TokenBalance } from "@/types";

interface TopHoldingsProps {
  holdings: TokenBalance[];
  totalValue: number;
}

export function TopHoldings({ holdings, totalValue }: TopHoldingsProps) {
  // Aggregate by symbol+chain
  const aggregated = new Map<string, TokenBalance & { portfolioPct: number }>();
  for (const h of holdings) {
    const key = `${h.chain}:${h.contractAddress}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.balanceFormatted += h.balanceFormatted;
      existing.valueUsd += h.valueUsd;
      existing.portfolioPct = totalValue > 0 ? (existing.valueUsd / totalValue) * 100 : 0;
    } else {
      aggregated.set(key, {
        ...h,
        portfolioPct: totalValue > 0 ? (h.valueUsd / totalValue) * 100 : 0,
      });
    }
  }

  const sorted = [...aggregated.values()]
    .filter((h) => h.valueUsd > 0.01)
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, 25);

  return (
    <Card className="p-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
        Holdings
      </h3>
      <div className="overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="text-[10px]">
              <TableHead className="w-[180px]">Token</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right w-[60px]">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((h, i) => (
              <TableRow key={`${h.chain}:${h.contractAddress}:${i}`} className="text-xs">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TokenIcon symbol={h.symbol} logo={h.logo} size="sm" />
                    <div>
                      <span className="font-medium">{h.symbol}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <ChainBadge chain={h.chain} />
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <CryptoValue value={h.balanceFormatted} symbol="" />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  <UsdValue value={h.priceUsd} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  <UsdValue value={h.valueUsd} />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {h.portfolioPct.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                  No holdings found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
