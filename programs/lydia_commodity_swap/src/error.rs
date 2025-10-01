use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid commodity type")]
    InvalidCommodityType,

    #[msg("Price feed is stale")]
    StalePriceFeed,

    #[msg("Invalid price value")]
    InvalidPrice,

    #[msg("Insufficient USDC balance")]
    InsufficientUSDC,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Invalid Pyth price account")]
    InvalidPythAccount,
}
