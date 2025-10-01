use anchor_lang::prelude::*;

#[account]
pub struct CommodityPool {
    pub authority: Pubkey,           // Pool authority
    pub usdc_vault: Pubkey,          // USDC vault to hold received USDC
    pub oil_mint: Pubkey,            // Oil token mint
    pub gold_mint: Pubkey,           // Gold token mint
    pub silver_mint: Pubkey,         // Silver token mint
    pub natural_gas_mint: Pubkey,    // Natural Gas token mint
    pub bump: u8,                    // PDA bump
}

impl CommodityPool {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // usdc_vault
        32 + // oil_mint
        32 + // gold_mint
        32 + // silver_mint
        32 + // natural_gas_mint
        1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum CommodityType {
    Oil,
    Gold,
    Silver,
    NaturalGas,
}

impl CommodityType {
    pub fn get_price_feed(&self) -> &str {
        match self {
            CommodityType::Oil => crate::constants::OIL_PRICE_FEED,
            CommodityType::Gold => crate::constants::GOLD_PRICE_FEED,
            CommodityType::Silver => crate::constants::SILVER_PRICE_FEED,
            CommodityType::NaturalGas => crate::constants::NATURAL_GAS_PRICE_FEED,
        }
    }
}
