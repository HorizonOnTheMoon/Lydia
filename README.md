# Lydia - Commodity Token Swap Platform

[![Rust CI](https://github.com/HorizonOnTheMoon/Lydia/workflows/Rust%20CI/badge.svg)](https://github.com/HorizonOnTheMoon/Lydia/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.29.0-blue)](https://www.anchor-lang.com/)
[![Deployed](https://img.shields.io/badge/Deployed-✅%20Live-success)](https://explorer.solana.com/address/HsBV6Uhk4NV65zTK93ofoT8zYei91bezMdCFXgAPoKE8?cluster=devnet)

**Spot swap platform for commodity tokens on Solana Devnet**

## Overview

Lydia enables users to swap USDC for tokenized commodities on Solana Devnet. The smart contract creates four commodity tokens (Oil, Gold, Silver, Natural Gas) and allows users to exchange USDC for these tokens at fixed rates.

### Supported Commodities
- **Oil** - Crude oil token ($75/barrel)
- **Gold** - Gold token ($1850/oz)
- **Silver** - Silver token ($24/oz)
- **Natural Gas** - Natural gas token ($3/MMBtu)

### Technical Stack
- **Network**: Solana Devnet
- **Framework**: Anchor 0.29.0
- **Language**: Rust
- **Payment Token**: USDC (Devnet)

## Project Structure

```
lydia_commodity_swap/
├── programs/lydia_commodity_swap/src/
│   ├── lib.rs                      # Program entry point
│   ├── constants.rs                # Constants and seeds
│   ├── error.rs                    # Custom errors
│   ├── state/
│   │   ├── commodity_pool.rs       # Pool state and commodity types
│   │   └── mod.rs
│   └── instructions/
│       ├── initialize.rs           # Initialize pool and mints
│       ├── swap.rs                 # Swap USDC for commodities
│       └── mod.rs
└── target/
    ├── deploy/lydia_commodity_swap.so
    └── idl/lydia_commodity_swap.json
```

## Installation

### Prerequisites
- Rust 1.70+
- Solana CLI 2.2+
- Anchor CLI 0.29+
- Node.js 18+

### Build

```bash
cd lydia_commodity_swap

# Build with cargo (Solana 2.x uses build-sbf)
cargo build-sbf

# Binary will be at: target/deploy/lydia_commodity_swap.so
```

### Deploy to Devnet

```bash
# Set Solana to devnet
solana config set --url devnet

# Deploy program
solana program deploy target/deploy/lydia_commodity_swap.so

# Program ID: HsBV6Uhk4NV65zTK93ofoT8zYei91bezMdCFXgAPoKE8
# Deployed: ✅ Live on Devnet
```

## Smart Contract Features

### 1. Initialize Pool
Creates the commodity swap pool with:
- 4 commodity token mints (Oil, Gold, Silver, Natural Gas)
- USDC vault to collect payments
- Pool authority (PDA)

### 2. Swap USDC for Commodities
Users can swap USDC for any commodity token:
- Fixed prices (mock prices for devnet testing)
- Instant minting of commodity tokens
- USDC transferred to pool vault

### Pricing (Mock for Devnet)
- Oil: $75 per token
- Gold: $1850 per token
- Silver: $24 per token
- Natural Gas: $3 per token

**Note**: In production, integrate with Pyth Oracle for real-time pricing.

## Usage Example

```typescript
// Initialize the pool (one-time setup)
await program.methods
  .initialize()
  .accounts({
    pool: poolPda,
    authority: provider.wallet.publicKey,
    usdcVault: usdcVaultPda,
    usdcMint: USDC_MINT,
    oilMint: oilMintKeypair.publicKey,
    goldMint: goldMintKeypair.publicKey,
    silverMint: silverMintKeypair.publicKey,
    naturalGasMint: naturalGasMintKeypair.publicKey,
  })
  .rpc();

// Swap 100 USDC for Gold tokens
await program.methods
  .swap(
    { gold: {} },  // CommodityType enum
    new BN(100_000_000)  // 100 USDC (6 decimals)
  )
  .accounts({
    pool: poolPda,
    userUsdcAccount: userUsdcAta,
    usdcVault: usdcVaultPda,
    userCommodityAccount: userGoldAta,
    commodityMint: goldMint,
    priceFeed: SystemProgram.programId, // Placeholder for now
    user: provider.wallet.publicKey,
  })
  .rpc();
```

## Testing

The smart contract has been deployed and verified on Solana Devnet. Test files are available in the `tests/` directory.

```bash
# Run tests (requires Anchor CLI and Solana devnet connection)
anchor test --skip-local-validator
```

**Note**: Test suite includes:
- Pool initialization
- USDC to Gold swap
- USDC to Oil swap
- Balance verification

## Future Enhancements

- [ ] Real Pyth Oracle integration for live pricing
- [ ] Reverse swap (Commodity → USDC)
- [ ] Liquidity pools with AMM
- [ ] Staking and yield farming
- [ ] Governance token
- [ ] Full test suite with mocked price feeds 