# Crypto Tracker Portfolio — Design Spec

## Overview
Multi-chain crypto portfolio tracker. Users paste wallet addresses (Ethereum, L2s, Solana) and see aggregated holdings, DeFi positions, transaction history, and portfolio evolution — all in a dense Bloomberg-style dashboard.

## Requirements

### Core Features
1. **Wallet Management** — Add/remove/label wallet addresses. Supports ETH, Arbitrum, Optimism, Base, Polygon, Solana. Stored in localStorage.
2. **Token Balances** — Fetch all fungible token balances per wallet across all chains. No NFTs.
3. **DeFi Positions** — Detect staking (Lido, Rocket Pool), lending (Aave, Compound), LP positions (Uniswap, Raydium) and show their USD value.
4. **Transaction History** — Full history per wallet: transfers, swaps, bridges, stakes. Categorized by type.
5. **Portfolio Evolution** — Aggregated line chart showing total portfolio value over time across all wallets.
6. **Wallet Explorer** — Enter any address (not just saved ones) to explore holdings and activity.
7. **Price Data** — USD prices for all tokens via DeFiLlama API.

### Non-Goals
- No wallet connection (MetaMask/Phantom) — paste-only
- No NFTs
- No backend/database — all client-side
- No authentication

## Architecture

### Stack
- Next.js 16 with `output: 'export'` (static site)
- React 19, Tailwind CSS 4, shadcn/ui
- Recharts for charts
- localStorage for persistence

### Data Sources
| Source | Purpose | Rate Limits |
|--------|---------|-------------|
| Alchemy SDK | ERC-20 balances, tx history, contract calls (ETH + L2s) | 300M CU/month free |
| Helius API | SPL tokens, tx history, DeFi (Solana) | 1000 req/day free |
| DeFiLlama | Token prices in USD | No key, generous limits |

### Supported Chains
| Chain | ID | Provider | Explorer |
|-------|----|----------|----------|
| Ethereum | 1 | Alchemy | etherscan.io |
| Arbitrum | 42161 | Alchemy | arbiscan.io |
| Optimism | 10 | Alchemy | optimistic.etherscan.io |
| Base | 8453 | Alchemy | basescan.org |
| Polygon | 137 | Alchemy | polygonscan.com |
| Solana | — | Helius | solscan.io |

### Project Structure
```
src/
  app/
    page.tsx                    # Dashboard (portfolio overview)
    explore/page.tsx            # Wallet explorer
    history/page.tsx            # Transaction history
    layout.tsx                  # Root layout with sidebar
  components/
    layout/
      Sidebar.tsx               # Navigation sidebar
      Header.tsx                # Top bar with total value
    dashboard/
      PortfolioSummary.tsx      # Total value, 24h change
      ChainBreakdown.tsx        # Value per chain (bar/pie)
      TopHoldings.tsx           # Top tokens table
      PortfolioChart.tsx        # Evolution line chart
      DeFiPositions.tsx         # Staking/lending/LP summary
    wallet/
      WalletManager.tsx         # Add/remove/label wallets
      WalletCard.tsx            # Single wallet summary
    explore/
      AddressInput.tsx          # Address input + chain detection
      ExploreResults.tsx        # Holdings/activity for any address
    history/
      TransactionTable.tsx      # Full tx history with filters
      TransactionRow.tsx        # Single tx row
    common/
      TokenIcon.tsx             # Token logo (from CoinGecko CDN)
      ChainBadge.tsx            # Chain indicator
      FormatValue.tsx           # USD/crypto formatting
  lib/
    chains/
      config.ts                 # Chain configs (id, name, rpc, explorer)
      detection.ts              # Detect chain from address format
    providers/
      alchemy.ts                # Alchemy SDK wrapper (EVM balances, txs)
      helius.ts                 # Helius API wrapper (Solana)
      defillama.ts              # Price fetching
    defi/
      index.ts                  # Aggregate DeFi positions
      aave.ts                   # Aave lending positions
      lido.ts                   # Lido stETH staking
      uniswap.ts                # Uniswap LP positions
      raydium.ts                # Raydium LP (Solana)
    portfolio/
      aggregator.ts             # Combine all wallets + chains into portfolio
      history.ts                # Build portfolio value over time
      pnl.ts                    # P&L calculations
    storage/
      wallets.ts                # localStorage CRUD for wallets
      settings.ts               # User preferences
    utils/
      format.ts                 # Number/address formatting
      constants.ts              # Known token addresses, decimals
  hooks/
    useWallets.ts               # Wallet CRUD hook
    useBalances.ts              # Fetch balances for wallet(s)
    useTransactions.ts          # Fetch tx history
    useDeFiPositions.ts         # Fetch DeFi positions
    usePortfolio.ts             # Aggregated portfolio data
    usePrices.ts                # Token prices
  types/
    index.ts                    # Wallet, Token, Transaction, DeFiPosition, etc.
```

### Data Models (TypeScript types)

```typescript
type Chain = 'ethereum' | 'arbitrum' | 'optimism' | 'base' | 'polygon' | 'solana';

interface Wallet {
  address: string;
  label: string;
  chains: Chain[];       // which chains to scan
  addedAt: number;       // timestamp
}

interface TokenBalance {
  chain: Chain;
  address: string;       // token contract address
  symbol: string;
  name: string;
  decimals: number;
  balance: string;       // raw balance
  balanceFormatted: number;
  priceUsd: number;
  valueUsd: number;
  logo?: string;
}

interface Transaction {
  chain: Chain;
  hash: string;
  type: 'transfer' | 'swap' | 'bridge' | 'stake' | 'unstake' | 'approve' | 'other';
  from: string;
  to: string;
  timestamp: number;
  tokenIn?: { symbol: string; amount: number; valueUsd: number };
  tokenOut?: { symbol: string; amount: number; valueUsd: number };
  fee: { amount: number; valueUsd: number };
}

interface DeFiPosition {
  chain: Chain;
  protocol: string;      // 'aave', 'lido', 'uniswap', 'raydium'
  type: 'staking' | 'lending' | 'liquidity';
  tokens: { symbol: string; amount: number; valueUsd: number }[];
  totalValueUsd: number;
  apy?: number;
}

interface PortfolioSnapshot {
  timestamp: number;
  totalValueUsd: number;
  byChain: Record<Chain, number>;
}
```

### Pages

#### Dashboard (`/`)
Dense Bloomberg-style layout:
- **Top bar:** Total portfolio value + 24h/7d/30d change
- **Left column (60%):** Portfolio evolution chart (Recharts area chart, timeframe selector), Top holdings table (token, chain, balance, value, % of portfolio, 24h change)
- **Right column (40%):** Chain breakdown (horizontal bars), DeFi positions summary, Wallet list with individual values
- Color scheme: dark theme, green/red for gains/losses

#### Wallet Explorer (`/explore`)
- Address input with auto-detect chain (0x = EVM, base58 = Solana)
- Shows same data as dashboard but for a single arbitrary address
- Option to "Add to portfolio" from explorer

#### Transaction History (`/history`)
- Filterable by: wallet, chain, tx type, date range
- Sortable columns: date, type, tokens, value, fee
- Links to block explorer per tx

### API Key Management
- API keys stored in localStorage (settings page)
- User enters their own Alchemy/Helius keys
- Fallback: app ships with default keys for demo (low-tier)
- Keys are only used client-side, never sent to any server

### Refresh Strategy
- Manual refresh button (no auto-polling to conserve rate limits)
- Cache balances in localStorage with TTL (5 min)
- Show "last updated" timestamp
- Loading states with skeletons

### Error Handling
- Chain-level errors (one chain down doesn't break others)
- Rate limit detection with backoff
- Graceful fallback when APIs are unavailable
- Toast notifications for errors
