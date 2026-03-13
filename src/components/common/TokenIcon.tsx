"use client";

import { cn } from "@/lib/utils";

const FALLBACK_COLORS = [
  "bg-blue-500/30",
  "bg-green-500/30",
  "bg-purple-500/30",
  "bg-orange-500/30",
  "bg-pink-500/30",
  "bg-cyan-500/30",
];

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
  const sizeClass = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  }[size];

  const colorIndex =
    symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    FALLBACK_COLORS.length;

  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={symbol}
        className={cn("rounded-full object-cover", sizeClass, className)}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
        }}
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
