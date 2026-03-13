"use client";

import { useState, useEffect } from "react";
import { Save, Key, Info, Trash2, Database, Globe, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useWallets } from "@/hooks/useWallets";

interface Settings {
  heliusApiKey: string;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem("crypto-tracker-settings");
    if (!raw) return { heliusApiKey: "" };
    const parsed = JSON.parse(raw);
    return { heliusApiKey: parsed.heliusApiKey || "" };
  } catch {
    return { heliusApiKey: "" };
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ heliusApiKey: "" });
  const [loaded, setLoaded] = useState(false);
  const { wallets } = useWallets();

  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

  const handleSave = () => {
    const current = JSON.parse(localStorage.getItem("crypto-tracker-settings") || "{}");
    localStorage.setItem(
      "crypto-tracker-settings",
      JSON.stringify({ ...current, ...settings })
    );
    toast.success("Settings saved");
  };

  if (!loaded) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Configure API keys and manage your data
        </p>
      </div>

      {/* Portfolio summary */}
      <div className="rounded-xl border border-border/30 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
            Portfolio Overview
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white/[0.03] border border-border/20 p-4">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Wallets
            </span>
            <p className="text-lg font-bold tabular-nums text-foreground mt-1">
              {wallets.length}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-border/20 p-4">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Chains Tracked
            </span>
            <p className="text-lg font-bold tabular-nums text-foreground mt-1">
              {new Set(wallets.flatMap((w) => w.chains)).size}
            </p>
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="rounded-xl border border-border/30 bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
            API Configuration
          </h2>
        </div>

        <div className="rounded-lg bg-white/[0.03] border border-border/20 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            EVM chains (Ethereum, Arbitrum, Optimism, Base, Polygon) use free public RPCs -- no API key needed.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-medium text-foreground">
            Helius API Key
            <span className="text-[11px] text-muted-foreground ml-2">(Solana)</span>
          </label>
          <Input
            type="password"
            placeholder="Enter your Helius API key"
            value={settings.heliusApiKey}
            onChange={(e) => setSettings((s) => ({ ...s, heliusApiKey: e.target.value }))}
            className="text-[13px] font-mono bg-white/[0.03] border-border/30 h-10"
          />
          <p className="text-[11px] text-muted-foreground">
            Required for Solana balances and transactions. Get a free key at{" "}
            <a
              href="https://helius.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
            >
              helius.dev
            </a>
          </p>
        </div>

        <Button onClick={handleSave} className="gap-2 rounded-lg">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      {/* Data Sources */}
      <div className="rounded-xl border border-border/30 bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
            Data Sources
          </h2>
        </div>

        <div className="space-y-2">
          {[
            { label: "Ethereum / L2s", value: "Public RPCs (PublicNode)", status: "active" },
            { label: "Solana", value: settings.heliusApiKey ? "Helius API" : "Not configured", status: settings.heliusApiKey ? "active" : "inactive" },
            { label: "Token Prices", value: "DeFi Llama API", status: "active" },
            { label: "DeFi Positions", value: "On-chain detection (Lido, Aave, Uniswap, Raydium)", status: "active" },
          ].map((source) => (
            <div
              key={source.label}
              className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-border/20 px-4 py-3"
            >
              <div>
                <span className="text-[13px] text-foreground">{source.label}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">{source.value}</p>
              </div>
              <div
                className={`h-2 w-2 rounded-full ${
                  source.status === "active" ? "bg-[var(--color-gain)]" : "bg-muted-foreground/30"
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Data Storage */}
      <div className="rounded-xl border border-border/30 bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
            Data Storage
          </h2>
        </div>

        <p className="text-[13px] text-muted-foreground leading-relaxed">
          All data is stored locally in your browser. No data leaves your device except
          blockchain RPC calls to fetch balances and prices.
        </p>

        <Button
          variant="destructive"
          size="sm"
          className="gap-2 rounded-lg"
          onClick={() => {
            if (confirm("Clear all local data? This will remove wallets, history, and settings.")) {
              localStorage.removeItem("crypto-tracker-wallets");
              localStorage.removeItem("crypto-tracker-settings");
              localStorage.removeItem("crypto-tracker-balances");
              localStorage.removeItem("crypto-tracker-portfolio-history");
              toast.success("All data cleared");
              window.location.reload();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Clear All Data
        </Button>
      </div>
    </div>
  );
}
