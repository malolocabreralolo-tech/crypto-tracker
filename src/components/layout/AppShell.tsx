"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import type { Chain, TokenBalance, DeFiPosition, Transaction, PortfolioSnapshot, Wallet } from "@/types";
import type { HyperliquidData } from "@/hooks/useHyperliquid";

interface AppContextType {
  selectedWallet: string | null;
  setSelectedWallet: (address: string | null) => void;
  // Portfolio data
  wallets: Wallet[];
  balances: TokenBalance[];
  positions: DeFiPosition[];
  transactions: Transaction[];
  hyperliquidData: HyperliquidData[];
  totalValue: number;
  byChain: Partial<Record<Chain, number>>;
  byWallet: Record<string, number>;
  topHoldings: TokenBalance[];
  history: PortfolioSnapshot[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextType>(null!);

export function useAppContext() {
  return useContext(AppContext);
}

export function AppShell({ children }: { children: ReactNode }) {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const portfolio = usePortfolio();

  return (
    <AppContext.Provider value={{ selectedWallet, setSelectedWallet, ...portfolio }}>
      {children}
    </AppContext.Provider>
  );
}
