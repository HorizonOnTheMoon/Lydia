pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("HsBV6Uhk4NV65zTK93ofoT8zYei91bezMdCFXgAPoKE8");

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
