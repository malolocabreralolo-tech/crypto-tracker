"use client";

import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TopHoldings } from "@/components/dashboard/TopHoldings";
import { ChainBreakdown } from "@/components/dashboard/ChainBreakdown";
import { DeFiPositions } from "@/components/dashboard/DeFiPositions";
import { UsdValue } from "@/components/common/FormatValue";
import { useWallets } from "@/hooks/useWallets";
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

  const totalValue = balances.reduce((sum, b) => sum + b.valueUsd, 0)
    + defiPositions.reduce((sum, p) => sum + p.totalValueUsd, 0);

  const byChain: Partial<Record<Chain, number>> = {};
  for (const b of balances) {
    byChain[b.chain] = (byChain[b.chain] || 0) + b.valueUsd;
  }
  for (const p of defiPositions) {
    byChain[p.chain] = (byChain[p.chain] || 0) + p.totalValueUsd;
  }

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

      // Fetch balances + DeFi via API routes
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

      // Fetch prices via API route
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
  };

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-bold">Wallet Explorer</h1>
        <p className="text-xs text-muted-foreground">
          Explore any Ethereum/L2/Solana address
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="0x... or Solana address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="flex-1 font-mono text-xs"
          onKeyDown={(e) => e.key === "Enter" && handleExplore()}
        />
        <Button onClick={handleExplore} disabled={loading || !address.trim()} className="gap-1.5">
          <Search className="h-4 w-4" />
          {loading ? "Loading..." : "Explore"}
        </Button>
        {explored && !isAlreadyTracked && balances.length > 0 && (
          <Button variant="outline" onClick={handleAddToPortfolio} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Track
          </Button>
        )}
      </div>

      {error && (
        <Card className="p-3 border-destructive/50 bg-destructive/10">
          <p className="text-xs text-destructive">{error}</p>
        </Card>
      )}

      {explored && (
        <>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-primary">
              <UsdValue value={totalValue} />
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {address.slice(0, 10)}...{address.slice(-6)}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <TopHoldings
                holdings={balances.sort((a, b) => b.valueUsd - a.valueUsd)}
                totalValue={totalValue}
              />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <ChainBreakdown byChain={byChain} totalValue={totalValue} />
              <DeFiPositions positions={defiPositions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
