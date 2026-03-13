"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-white/[0.06]",
        className
      )}
    />
  );
}

export function TokenRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-3 border-b border-border/10">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <div className="space-y-1.5 text-right">
        <Skeleton className="h-3 w-14 ml-auto" />
        <Skeleton className="h-2.5 w-10 ml-auto" />
      </div>
      <div className="space-y-1.5 text-right">
        <Skeleton className="h-3 w-16 ml-auto" />
        <Skeleton className="h-2.5 w-8 ml-auto" />
      </div>
      <Skeleton className="h-5 w-10 rounded" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Net worth skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-56" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>

      {/* Chart skeleton */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
        <Skeleton className="h-[280px] w-full rounded-lg" />
        <div className="flex gap-1 justify-center">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-10 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="border-b border-border/20 pb-0">
        <div className="flex gap-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-none" />
          ))}
        </div>
      </div>

      {/* Token rows skeleton */}
      <div>
        {Array.from({ length: 6 }).map((_, i) => (
          <TokenRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[280px] w-full rounded-lg" />
      <div className="flex gap-1 justify-center">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-10 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
