"use client";

import { cn } from "@/lib/utils";
import type { Chain } from "@/types";

const chainColors: Record<Chain, string> = {
  ethereum: "bg-blue-500/20 text-blue-400",
  arbitrum: "bg-sky-500/20 text-sky-400",
  optimism: "bg-red-500/20 text-red-400",
  base: "bg-blue-600/20 text-blue-300",
  polygon: "bg-purple-500/20 text-purple-400",
  solana: "bg-gradient-to-r from-purple-500/20 to-teal-500/20 text-teal-400",
};

const chainLabels: Record<Chain, string> = {
  ethereum: "ETH",
  arbitrum: "ARB",
  optimism: "OP",
  base: "BASE",
  polygon: "POLY",
  solana: "SOL",
};

export function ChainBadge({ chain, className }: { chain: Chain; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider",
        chainColors[chain],
        className
      )}
    >
      {chainLabels[chain]}
    </span>
  );
}
