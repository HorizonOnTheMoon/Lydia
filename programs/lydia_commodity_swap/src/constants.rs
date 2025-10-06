use anchor_lang::prelude::*;
use std::str::FromStr;

#[constant]
pub const VAULT_SEED: &[u8] = b"vault";

#[constant]
pub const POOL_SEED: &[u8] = b"pool";

// Devnet USDC (official) - String constants
pub const USDC_MINT_STR: &str = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
pub const OIL_MINT_STR: &str = "AigaX4V7Wx7SPDC9Wc3zTkrCkWF1nQGEa8G2fUmLtGoH";
pub const GOLD_MINT_STR: &str = "DbMEk1Fyb7KE34foshKbbB8D9BLfy3jEFFR4WUkdST4R";
pub const SILVER_MINT_STR: &str = "Ay5iazmqsYhGZMvgVkELBKUQSqnbs7LxtjpHet29nCA3";
pub const NATURAL_GAS_MINT_STR: &str = "BZognty8N6LiLKCrEGLP3hbqef8LFrYfK3SbNSZgqGQe";

// Helper function to get Pubkey from string
pub fn usdc_mint() -> Pubkey {
    Pubkey::from_str(USDC_MINT_STR).unwrap()
}

pub fn oil_mint() -> Pubkey {
    Pubkey::from_str(OIL_MINT_STR).unwrap()
}

pub fn gold_mint() -> Pubkey {
    Pubkey::from_str(GOLD_MINT_STR).unwrap()
}

pub fn silver_mint() -> Pubkey {
    Pubkey::from_str(SILVER_MINT_STR).unwrap()
}

pub fn natural_gas_mint() -> Pubkey {
    Pubkey::from_str(NATURAL_GAS_MINT_STR).unwrap()
}

// Pyth Price Feed IDs (Hex format for Pyth Network)
// These are the actual feed IDs, not account addresses
// Source: https://pyth.network/developers/price-feed-ids

// Oil/USD (WTI Crude Oil)
pub const OIL_PRICE_FEED_ID: &str = "2w9jhzYm9puy47VTNUpAhpVdSZyGSQUq7u7JVmJJ7TVc";

// Gold/USD (XAU/USD)
pub const GOLD_PRICE_FEED_ID: &str = "2uPQGpm8X4ZkxMHxrAW1QuhXcse1AHEgPih6Xp9NuEWW";

// Silver/USD (XAG/USD)
pub const SILVER_PRICE_FEED_ID: &str = "H9JxsWwtDZxjSL6m7cdCVsWibj3JBMD9sxqLjadoZnot";

// Natural Gas/USD
pub const NATURAL_GAS_PRICE_FEED_ID: &str = "3cqhrj49qGbSfvaWCRCsTE9314NUKuUwM1REkiS2dRKe";
