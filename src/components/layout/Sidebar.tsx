"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  Clock,
  Plus,
  Trash2,
  Wallet,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallets } from "@/hooks/useWallets";
import type { Chain } from "@/types";

function detectAddressType(address: string): "evm" | "solana" | null {
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return "evm";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return "solana";
  return null;
}

function abbrevAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const navItems = [
  { href: "/", label: "Portfolio", icon: LayoutDashboard },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/history", label: "Activity", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  selectedWallet: string | null;
  onSelectWallet: (address: string | null) => void;
  totalValue?: number;
  walletValues?: Record<string, number>;
}

export function Sidebar({ selectedWallet, onSelectWallet, totalValue = 0, walletValues = {} }: SidebarProps) {
  const pathname = usePathname();
  const { wallets, addWallet, removeWallet } = useWallets();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [walletsExpanded, setWalletsExpanded] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const copyAddress = (addr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 1500);
  };

  const handleAdd = () => {
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    const type = detectAddressType(trimmed);
    if (!type) return;

    // EVM wallets also get Hyperliquid by default (uses same 0x address)
    const chains: Chain[] =
      type === "solana"
        ? ["solana"]
        : ["ethereum", "arbitrum", "optimism", "base", "polygon", "hyperliquid"];

    addWallet(trimmed, newLabel.trim() || `Wallet ${wallets.length + 1}`, chains);
    setNewAddress("");
    setNewLabel("");
    setShowAddForm(false);
  };

  return (
    <aside className="w-60 border-r border-border/50 bg-[oklch(0.08_0.005_250)] flex flex-col h-screen shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border/30">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-sm tracking-widest text-foreground/90">
            CRYPTO TRACKER
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="px-2 pt-4 pb-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="mx-4 my-2 border-t border-border/20" />

      {/* Wallets Section */}
      <div className="px-2 flex-1 overflow-hidden flex flex-col">
        <button
          onClick={() => setWalletsExpanded(!walletsExpanded)}
          className="flex items-center justify-between px-3 py-2 w-full text-left"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Wallets
          </span>
          {walletsExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {walletsExpanded && (
          <div className="flex-1 overflow-auto space-y-0.5 pb-2">
            {/* All Wallets option */}
            <button
              onClick={() => onSelectWallet(null)}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 rounded-lg text-[12px] transition-all",
                selectedWallet === null
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
              )}
            >
              <span className="font-medium">All Wallets</span>
              {totalValue > 0 && (
                <span className="tabular-nums text-[11px]">
                  ${totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
              )}
            </button>

            {/* Individual wallets */}
            {wallets.map((w) => {
              const val = walletValues[w.address] || 0;
              const isSelected = selectedWallet === w.address;
              return (
                <div
                  key={w.id}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-all cursor-pointer",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                  )}
                  onClick={() => onSelectWallet(isSelected ? null : w.address)}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate text-[12px]">{w.label}</div>
                    <button
                      onClick={(e) => copyAddress(w.address, e)}
                      className="text-[10px] opacity-60 font-mono hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                      {abbrevAddress(w.address)}
                      {copiedAddress === w.address ? (
                        <Check className="h-2.5 w-2.5 text-[var(--color-gain)]" />
                      ) : (
                        <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {val > 0 && (
                      <span className="tabular-nums text-[11px]">
                        ${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWallet(w.id);
                      }}
                      className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add wallet button / form */}
            {showAddForm ? (
              <div className="px-2 pt-2 space-y-2">
                <Input
                  placeholder="0x... or Solana address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="h-8 text-[11px] font-mono bg-white/[0.03] border-border/30"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  autoFocus
                />
                <Input
                  placeholder="Label (optional)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="h-8 text-[11px] bg-white/[0.03] border-border/30"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={!detectAddressType(newAddress.trim())}
                    className="flex-1 h-7 text-[11px]"
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewAddress("");
                      setNewLabel("");
                    }}
                    className="h-7 text-[11px]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Wallet
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom: total value */}
      <div className="px-4 py-3 border-t border-border/20">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Net Worth</div>
        <div className="text-sm font-bold tabular-nums text-foreground">
          ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </aside>
  );
}
