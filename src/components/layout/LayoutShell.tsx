"use client";

import { Sidebar } from "./Sidebar";
import { AppShell, useAppContext } from "./AppShell";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { selectedWallet, setSelectedWallet, totalValue, byWallet } = useAppContext();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        selectedWallet={selectedWallet}
        onSelectWallet={setSelectedWallet}
        totalValue={totalValue}
        walletValues={byWallet}
      />
      <main className="flex-1 overflow-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <LayoutInner>{children}</LayoutInner>
    </AppShell>
  );
}
