"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChainBadge } from "@/components/common/ChainBadge";
import { UsdValue } from "@/components/common/FormatValue";
import { ExternalLink } from "lucide-react";
import { useWallets } from "@/hooks/useWallets";
import { useTransactions } from "@/hooks/useTransactions";
import type { Chain, Transaction } from "@/types";

const CHAIN_EXPLORERS: Record<Chain, string> = {
  ethereum: "https://etherscan.io/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  optimism: "https://optimistic.etherscan.io/tx/",
  base: "https://basescan.org/tx/",
  polygon: "https://polygonscan.com/tx/",
  solana: "https://solscan.io/tx/",
};

const typeColors: Record<Transaction["type"], string> = {
  transfer: "bg-blue-500/20 text-blue-400",
  swap: "bg-purple-500/20 text-purple-400",
  bridge: "bg-orange-500/20 text-orange-400",
  stake: "bg-green-500/20 text-green-400",
  unstake: "bg-yellow-500/20 text-yellow-400",
  approve: "bg-gray-500/20 text-gray-400",
  other: "bg-gray-500/20 text-gray-400",
};

export default function HistoryPage() {
  const { wallets, loaded } = useWallets();
  const { transactions, loading, fetchTransactions } = useTransactions();
  const [chainFilter, setChainFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [walletFilter, setWalletFilter] = useState<string>("all");

  useEffect(() => {
    if (loaded && wallets.length > 0) {
      fetchTransactions(wallets);
    }
  }, [loaded, wallets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = transactions.filter((tx) => {
    if (chainFilter !== "all" && tx.chain !== chainFilter) return false;
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;
    if (walletFilter !== "all" && tx.walletAddress !== walletFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-bold">Transaction History</h1>
        <p className="text-xs text-muted-foreground">
          {transactions.length} transactions across all wallets
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={chainFilter} onValueChange={(v) => v && setChainFilter(v)}>
          <SelectTrigger className="w-32 text-xs h-8">
            <SelectValue placeholder="Chain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Chains</SelectItem>
            <SelectItem value="ethereum">Ethereum</SelectItem>
            <SelectItem value="arbitrum">Arbitrum</SelectItem>
            <SelectItem value="optimism">Optimism</SelectItem>
            <SelectItem value="base">Base</SelectItem>
            <SelectItem value="polygon">Polygon</SelectItem>
            <SelectItem value="solana">Solana</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
          <SelectTrigger className="w-32 text-xs h-8">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="swap">Swap</SelectItem>
            <SelectItem value="bridge">Bridge</SelectItem>
            <SelectItem value="stake">Stake</SelectItem>
            <SelectItem value="unstake">Unstake</SelectItem>
            <SelectItem value="approve">Approve</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {wallets.length > 1 && (
          <Select value={walletFilter} onValueChange={(v) => v && setWalletFilter(v)}>
            <SelectTrigger className="w-40 text-xs h-8">
              <SelectValue placeholder="Wallet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Wallets</SelectItem>
              {wallets.map((w) => (
                <SelectItem key={w.id} value={w.address}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="text-[10px]">
                <TableHead className="w-[140px]">Date</TableHead>
                <TableHead className="w-[80px]">Type</TableHead>
                <TableHead className="w-[70px]">Chain</TableHead>
                <TableHead>From / To</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead className="text-right">In</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs py-8 text-muted-foreground">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs py-8 text-muted-foreground">
                    {wallets.length === 0
                      ? "Add wallets on the Dashboard to see transactions"
                      : "No transactions found"}
                  </TableCell>
                </TableRow>
              )}
              {filtered.slice(0, 100).map((tx) => (
                <TableRow key={`${tx.chain}:${tx.hash}`} className="text-xs">
                  <TableCell className="text-muted-foreground">
                    {new Date(tx.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${typeColors[tx.type]}`}>
                      {tx.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ChainBadge chain={tx.chain} />
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    <div>
                      {tx.from && (
                        <span>
                          {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                        </span>
                      )}
                    </div>
                    {tx.to && (
                      <div>
                        → {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-[var(--color-loss)]">
                    {tx.tokenIn && (
                      <span>
                        -{tx.tokenIn.amount.toFixed(4)} {tx.tokenIn.symbol}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-[var(--color-gain)]">
                    {tx.tokenOut && (
                      <span>
                        +{tx.tokenOut.amount.toFixed(4)} {tx.tokenOut.symbol}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`${CHAIN_EXPLORERS[tx.chain]}${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
