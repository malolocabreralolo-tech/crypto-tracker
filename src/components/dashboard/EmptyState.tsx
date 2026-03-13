"use client";

import { Wallet, ArrowRight, Globe, Shield, Layers } from "lucide-react";

export function EmptyState() {
  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Hero */}
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-6">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Track your crypto portfolio
        </h1>
        <p className="text-[14px] text-muted-foreground max-w-md mx-auto leading-relaxed">
          Paste any Ethereum, L2, or Solana wallet address to see aggregated
          balances, DeFi positions, and transaction history.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-12">
        {[
          {
            icon: Globe,
            title: "Multi-chain",
            desc: "Ethereum, Arbitrum, Optimism, Base, Polygon & Solana",
          },
          {
            icon: Layers,
            title: "DeFi tracking",
            desc: "Lido staking, Aave lending, Uniswap & Raydium LPs",
          },
          {
            icon: Shield,
            title: "Privacy first",
            desc: "All data stays in your browser. Read-only, no wallet connection needed",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-border/20 bg-white/[0.02] p-5 text-center"
          >
            <f.icon className="h-5 w-5 text-primary mx-auto mb-3" />
            <h3 className="text-[13px] font-semibold text-foreground mb-1">{f.title}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-border/20 text-[13px] text-muted-foreground">
          <ArrowRight className="h-4 w-4 text-primary" />
          Click <span className="font-semibold text-foreground">Add Wallet</span> in the sidebar to get started
        </div>
      </div>
    </div>
  );
}
