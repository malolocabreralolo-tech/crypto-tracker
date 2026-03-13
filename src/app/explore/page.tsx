"use client";

import { useState } from "react";
import { Search, Plus, Wallet, Coins, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TokensTable } from "@/components/dashboard/TokensTable";
import { DeFiPositions } from "@/components/dashboard/DeFiPositions";
import { useWallets } from "@/hooks/useWallets";
import { toast } from "sonner";
import type { Chain, TokenBalance, DeFiPosition } from "@/types";

function detectAddressType(address: string): "evm" | "solana" | null {
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return "evm";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return "solana";
  return null;
}

export default function ExplorePage() {
  const [address, setAddress] = useState("");
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [defiPositions, setDefiPositions] = useState<DeFiPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explored, setExplored] = useState(false);
  const { wallets, addWallet } = useWallets();

  const totalValue =
    balances.reduce((sum, b) => sum + b.valueUsd, 0) +
    defiPositions.reduce((sum, p) => sum + p.totalValueUsd, 0);

  const chainsDetected = new Set([
    ...balances.map((b) => b.chain),
    ...defiPositions.map((p) => p.chain),
  ]);

  const isAlreadyTracked = wallets.some(
    (w) => w.address.toLowerCase() === address.trim().toLowerCase()
  );

  const handleExplore = async () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    const type = detectAddressType(trimmed);
    if (!type) {
      setError("Invalid address format");
      return;
    }

    setLoading(true);
    setError(null);
    setExplored(true);

    try {
      const chains: Chain[] =
        type === "evm"
          ? ["ethereum", "arbitrum", "optimism", "base", "polygon"]
          : ["solana"];
      const chainsParam = chains.join(",");

      const newBalances: TokenBalance[] = [];
      const newPositions: DeFiPosition[] = [];

      const [balRes, defiRes] = await Promise.all([
        fetch(`/api/balances?address=${trimmed}&chains=${chainsParam}`),
        type === "evm"
          ? fetch(`/api/defi?address=${trimmed}&chains=${chainsParam}`)
          : Promise.resolve(null),
      ]);

      if (balRes.ok) {
        const data = await balRes.json();
        newBalances.push(...(data.balances || []));
      }
      if (defiRes?.ok) {
        const data = await defiRes.json();
        newPositions.push(...(data.positions || []));
      }

      // Fetch prices
      try {
        const tokens = newBalances
          .filter((b) => b.contractAddress)
          .map((b) => ({ chain: b.chain as string, address: b.contractAddress }));
        if (tokens.length > 0) {
          const priceRes = await fetch("/api/prices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tokens }),
          });
          if (priceRes.ok) {
            const { prices } = await priceRes.json();
            newBalances.forEach((b) => {
              const key = `${b.chain}:${b.contractAddress}`;
              if (prices[key] !== undefined) {
                b.priceUsd = prices[key];
                b.valueUsd = b.balanceFormatted * prices[key];
              }
            });
          }
        }
      } catch {}

      setBalances(newBalances);
      setDefiPositions(newPositions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to explore address");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPortfolio = () => {
    const trimmed = address.trim();
    const type = detectAddressType(trimmed);
    if (!type) return;
    const chains: Chain[] =
      type === "solana"
        ? ["solana"]
        : ["ethereum", "arbitrum", "optimism", "base", "polygon"];
    addWallet(trimmed, `Explored ${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`, chains);
    toast.success("Wallet added to portfolio");
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Wallet Explorer</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Look up any Ethereum, L2, or Solana wallet address
        </p>
      </div>

      {/* Search bar */}
      <div className="rounded-xl border border-border/30 bg-white/[0.02] p-5">
        <div className="flex gap-3">
          <Input
            placeholder="Enter wallet address (0x... or Solana)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="flex-1 font-mono text-[13px] h-11 bg-white/[0.03] border-border/30 rounded-lg"
            onKeyDown={(e) => e.key === "Enter" && handleExplore()}
          />
          <Button
            onClick={handleExplore}
            disabled={loading || !address.trim()}
            className="gap-2 h-11 px-6 rounded-lg"
          >
            <Search className="h-4 w-4" />
            {loading ? "Loading..." : "Explore"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-[13px] text-[var(--color-loss)]">{error}</p>
        </div>
      )}

      {/* Results */}
      {explored && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Total Value
                </span>
              </div>
              <span className="text-xl font-bold tabular-nums text-foreground">
                ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Tokens Found
                </span>
              </div>
              <span className="text-xl font-bold tabular-nums text-foreground">
                {balances.length}
              </span>
            </div>
            <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Chains
                </span>
              </div>
              <span className="text-xl font-bold tabular-nums text-foreground">
                {chainsDetected.size}
              </span>
            </div>
          </div>

          {/* Add to Portfolio */}
          {!isAlreadyTracked && balances.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-white/[0.02] p-4">
              <div className="flex-1">
                <p className="text-[13px] text-foreground font-medium">
                  Track this wallet
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Add to your portfolio to monitor balances over time
                </p>
              </div>
              <Button onClick={handleAddToPortfolio} variant="outline" className="gap-2 rounded-lg border-border/50">
                <Plus className="h-4 w-4" />
                Add to Portfolio
              </Button>
            </div>
          )}

          {isAlreadyTracked && (
            <div className="rounded-xl border border-[var(--color-gain)]/20 bg-[var(--color-gain)]/5 p-4">
              <p className="text-[13px] text-[var(--color-gain)]">
                This wallet is already in your portfolio
              </p>
            </div>
          )}

          {/* Tokens table */}
          <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4">
            <h2 className="text-lg font-bold text-foreground mb-4">Tokens</h2>
            <TokensTable
              holdings={balances.sort((a, b) => b.valueUsd - a.valueUsd)}
              totalValue={totalValue}
            />
          </div>

          {/* DeFi positions */}
          {defiPositions.length > 0 && (
            <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4">
              <h2 className="text-lg font-bold text-foreground mb-4">DeFi Positions</h2>
              <DeFiPositions positions={defiPositions} />
            </div>
          )}
        </>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-[13px] text-muted-foreground animate-pulse">
            Scanning wallet across chains...
          </div>
        </div>
      )}
    </div>
  );
}
