"use client";

import { useState, useEffect } from "react";
import { Save, Key, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    <div className="space-y-4 max-w-xl">
      <div>
        <h1 className="text-lg font-bold">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Configure API keys and manage data
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            EVM chains (Ethereum, Arbitrum, Optimism, Base, Polygon) use free public RPCs — no API key needed.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <label className="text-xs font-medium">Helius API Key (Solana)</label>
          </div>
          <Input
            type="password"
            placeholder="Enter your Helius API key"
            value={settings.heliusApiKey}
            onChange={(e) => setSettings((s) => ({ ...s, heliusApiKey: e.target.value }))}
            className="text-xs font-mono"
          />
          <p className="text-[10px] text-muted-foreground">
            Required for Solana balances and transactions. Get a free key at helius.dev
          </p>
        </div>

        <Button onClick={handleSave} className="gap-1.5">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Data Storage
        </h3>
        <p className="text-xs text-muted-foreground">
          Wallets and portfolio history are stored locally in your browser.
          API keys for Solana are configured server-side. No data leaves your browser except blockchain RPC calls.
        </p>
        <Button
          variant="destructive"
          size="sm"
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
          Clear All Data
        </Button>
      </Card>
    </div>
  );
}
