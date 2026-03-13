"use client";

import { cn } from "@/lib/utils";

export function UsdValue({ value, className }: { value: number; className?: string }) {
  const formatted = formatUsdCompact(value);
  return <span className={cn("tabular-nums", className)}>{formatted}</span>;
}

export function PercentChange({ value, className }: { value: number; className?: string }) {
  const isPositive = value >= 0;
  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        isPositive ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]",
        className
      )}
    >
      {isPositive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export function CryptoValue({
  value,
  symbol,
  className,
}: {
  value: number;
  symbol: string;
  className?: string;
}) {
  const decimals = value < 0.01 ? 6 : value < 1 ? 4 : 2;
  return (
    <span className={cn("tabular-nums", className)}>
      {value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      })}{" "}
      <span className="text-muted-foreground text-xs">{symbol}</span>
    </span>
  );
}

function formatUsdCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (Math.abs(value) < 0.01) {
    return `$${value.toFixed(6)}`;
  }
  return `$${value.toFixed(2)}`;
}
