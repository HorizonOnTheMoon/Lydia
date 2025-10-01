pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Ce7DZvMPxx62AaGCDbmHpQBsdsu5WpDmDiKDd5Qhi7v5");

#[program]
pub mod lydia_commodity_swap {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn swap(
        ctx: Context<Swap>,
        commodity_type: CommodityType,
        usdc_amount: u64,
    ) -> Result<()> {
        instructions::swap::handler(ctx, commodity_type, usdc_amount)
    }
}
