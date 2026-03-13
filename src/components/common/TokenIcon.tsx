"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const FALLBACK_COLORS = [
  "bg-blue-500/30",
  "bg-green-500/30",
  "bg-purple-500/30",
  "bg-orange-500/30",
  "bg-pink-500/30",
  "bg-cyan-500/30",
  "bg-teal-500/30",
  "bg-indigo-500/30",
];

// Well-known token logos via CoinGecko CDN
const KNOWN_LOGOS: Record<string, string> = {
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  WETH: "https://assets.coingecko.com/coins/images/2518/small/weth.png",
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  WBTC: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  DAI: "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  UNI: "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
  AAVE: "https://assets.coingecko.com/coins/images/12645/small/aave-token-round.png",
  CRV: "https://assets.coingecko.com/coins/images/12124/small/Curve.png",
  MATIC: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  POL: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  stETH: "https://assets.coingecko.com/coins/images/13442/small/steth_logo.png",
  wstETH: "https://assets.coingecko.com/coins/images/18834/small/wstETH.png",
  cbETH: "https://assets.coingecko.com/coins/images/27008/small/cbeth.png",
  rETH: "https://assets.coingecko.com/coins/images/20764/small/reth.png",
  SHIB: "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  PEPE: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  APE: "https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg",
  LDO: "https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png",
  SNX: "https://assets.coingecko.com/coins/images/3406/small/SNX.png",
  MKR: "https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png",
  ARB: "https://assets.coingecko.com/coins/images/16547/small/arb.jpg",
  OP: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  GMX: "https://assets.coingecko.com/coins/images/18323/small/arbit.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  WMATIC: "https://assets.coingecko.com/coins/images/14073/small/matic.png",
  USDbC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  HYPE: "https://assets.coingecko.com/coins/images/40845/small/hyperliquid.jpg",
  PURR: "https://assets.coingecko.com/coins/images/36712/small/purr.png",
  JEFF: "https://assets.coingecko.com/coins/images/36715/small/jeff.jpg",
};

export function getTokenLogo(symbol: string, logo?: string): string | undefined {
  if (logo) return logo;
  return KNOWN_LOGOS[symbol] || KNOWN_LOGOS[symbol.toUpperCase()];
}

export function TokenIcon({
  symbol,
  logo,
  size = "sm",
  className,
}: {
  symbol: string;
  logo?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  const sizeClass = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  }[size];

  const colorIndex =
    symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    FALLBACK_COLORS.length;

  const resolvedLogo = getTokenLogo(symbol, logo);

  if (resolvedLogo && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedLogo}
        alt={symbol}
        className={cn("rounded-full object-cover", sizeClass, className)}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold",
        sizeClass,
        FALLBACK_COLORS[colorIndex],
        className
      )}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
