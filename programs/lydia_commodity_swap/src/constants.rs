use anchor_lang::prelude::*;

#[constant]
pub const VAULT_SEED: &[u8] = b"vault";

#[constant]
pub const POOL_SEED: &[u8] = b"pool";

// Pyth Price Feed IDs for Devnet
// Oil (WTI Crude) - Devnet price feed
pub const OIL_PRICE_FEED: &str = "EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw";

// Gold - Devnet price feed
pub const GOLD_PRICE_FEED: &str = "3RjHTQX4iPF4P3WQy3VnKmFAcUvUjkQ6oMwXLwXvVbWs";

// Silver - Devnet price feed
pub const SILVER_PRICE_FEED: &str = "BQs4bPRVfN5P5R6aEBvVUqr1Hq4pCcJe2YF6Yo3r4YzT";

// Natural Gas - Devnet price feed
pub const NATURAL_GAS_PRICE_FEED: &str = "EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw";
