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

    #[msg("Invalid USDC mint - must use official Devnet USDC")]
    InvalidUSDCMint,

    #[msg("Invalid Oil mint - must use the designated Oil token")]
    InvalidOilMint,

    #[msg("Invalid Gold mint - must use the designated Gold token")]
    InvalidGoldMint,

    #[msg("Invalid Silver mint - must use the designated Silver token")]
    InvalidSilverMint,

    #[msg("Invalid Natural Gas mint - must use the designated Natural Gas token")]
    InvalidNaturalGasMint,
}
