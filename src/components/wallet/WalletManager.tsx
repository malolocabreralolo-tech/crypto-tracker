"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ChainBadge } from "@/components/common/ChainBadge";
import { UsdValue } from "@/components/common/FormatValue";
import { useWallets } from "@/hooks/useWallets";
import type { Chain } from "@/types";

const ALL_CHAINS: Chain[] = ["ethereum", "arbitrum", "optimism", "base", "polygon", "solana"];

function detectAddressType(address: string): "evm" | "solana" | null {
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return "evm";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return "solana";
  return null;
}

export function WalletManager({
  walletValues,
}: {
  walletValues?: Record<string, number>;
}) {
  const { wallets, addWallet, removeWallet, updateLabel } = useWallets();
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const handleAdd = () => {
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    const type = detectAddressType(trimmed);
    if (!type) return;

    const chains: Chain[] =
      type === "solana"
        ? ["solana"]
        : ["ethereum", "arbitrum", "optimism", "base", "polygon"];

    addWallet(trimmed, newLabel.trim() || `Wallet ${wallets.length + 1}`, chains);
    setNewAddress("");
    setNewLabel("");
  };

  const startEdit = (id: string, currentLabel: string) => {
    setEditingId(id);
    setEditLabel(currentLabel);
  };

  const saveEdit = (id: string) => {
    updateLabel(id, editLabel);
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="0x... or Solana address"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          className="flex-1 text-xs font-mono"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Input
          placeholder="Label"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="w-32 text-xs"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd} disabled={!detectAddressType(newAddress.trim())}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {wallets.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Add wallet addresses to start tracking
        </p>
      )}

      <div className="space-y-1.5">
        {wallets.map((w) => (
          <Card key={w.id} className="p-2.5 flex items-center gap-2 bg-card/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {editingId === w.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="h-6 text-xs w-28"
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(w.id)}
                    />
                    <button onClick={() => saveEdit(w.id)} className="text-primary">
                      <Check className="h-3 w-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-medium truncate">{w.label}</span>
                )}
                {walletValues?.[w.address] !== undefined && (
                  <UsdValue value={walletValues[w.address]} className="text-xs ml-auto" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-muted-foreground font-mono truncate">
                  {w.address.slice(0, 6)}...{w.address.slice(-4)}
                </span>
                <div className="flex gap-0.5">
                  {w.chains.map((c) => (
                    <ChainBadge key={c} chain={c} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {editingId !== w.id && (
                <button
                  onClick={() => startEdit(w.id, w.label)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => removeWallet(w.id)}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
