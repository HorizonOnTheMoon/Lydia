use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Transfer};
use crate::state::{CommodityPool, CommodityType};
use crate::error::ErrorCode;
use crate::constants::*;

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(
        mut,
        seeds = [POOL_SEED],
        bump = pool.bump
    )]
    pub pool: Account<'info, CommodityPool>,

    /// User's USDC token account
    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,

    /// Pool's USDC vault
    #[account(
        mut,
        address = pool.usdc_vault
    )]
    pub usdc_vault: Account<'info, TokenAccount>,

    /// User's commodity token account (to receive tokens)
    #[account(mut)]
    pub user_commodity_account: Account<'info, TokenAccount>,

    /// Commodity mint (will be one of: oil, gold, silver, natural_gas)
    #[account(mut)]
    pub commodity_mint: Account<'info, Mint>,

    /// Pyth price feed account
    /// CHECK: Validated in instruction logic
    pub price_feed: AccountInfo<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<Swap>,
    commodity_type: CommodityType,
    usdc_amount: u64,
) -> Result<()> {
    let pool = &ctx.accounts.pool;

    // Verify the correct mint is being used (hardcoded validation)
    match commodity_type {
        CommodityType::Oil => {
            require_keys_eq!(
                ctx.accounts.commodity_mint.key(),
                oil_mint(),
                ErrorCode::InvalidOilMint
            );
            require_keys_eq!(
                ctx.accounts.commodity_mint.key(),
                pool.oil_mint,
                ErrorCode::InvalidCommodityType
            );
        }
        CommodityType::Gold => {
            require_keys_eq!(
                ctx.accounts.commodity_mint.key(),
                gold_mint(),
                ErrorCode::InvalidGoldMint
            );
            require_keys_eq!(
                ctx.accounts.commodity_mint.key(),
                pool.gold_mint,
                ErrorCode::InvalidCommodityType
            );
        }
        CommodityType::Silver => {
            require_keys_eq!(
                ctx.accounts.commodity_mint.key(),
                silver_mint(),
                ErrorCode::InvalidSilverMint
            );
            require_keys_eq!(
                ctx.accounts.commodity_mint.key(),
                pool.silver_mint,
                ErrorCode::InvalidCommodityType
            );
        }
        CommodityType::NaturalGas => {
            require_keys_eq!(
                ctx.accounts.commodity_mint.key(),
                natural_gas_mint(),
                ErrorCode::InvalidNaturalGasMint
            );
            require_keys_eq!(
                ctx.accounts.commodity_mint.key(),
                pool.natural_gas_mint,
                ErrorCode::InvalidCommodityType
            );
        }
    }

    // Validate USDC vault uses official USDC mint
    require_keys_eq!(
        ctx.accounts.user_usdc_account.mint,
        usdc_mint(),
        ErrorCode::InvalidUSDCMint
    );

    // Mock prices for devnet testing
    // In production, integrate with Pyth Oracle for real-time pricing
    // Price in USD with 8 decimals (Pyth standard)
    let (price, expo): (i64, i32) = match commodity_type {
        CommodityType::Oil => (75_00000000, -8),      // $75 per barrel
        CommodityType::Gold => (1850_00000000, -8),   // $1850 per oz
        CommodityType::Silver => (24_00000000, -8),   // $24 per oz
        CommodityType::NaturalGas => (3_00000000, -8), // $3 per MMBtu
    };

    require!(price > 0, ErrorCode::InvalidPrice);

    // Calculate commodity amount
    // USDC has 6 decimals, commodity tokens have 6 decimals
    // Price format: price * 10^expo (e.g., $75 = 75_00000000 * 10^-8)

    // Normalize price to 6 decimals
    let price_normalized = if expo < 0 {
        let expo_abs = (-expo) as u32;
        if expo_abs >= 6 {
            // Price has more decimals than we need, divide
            (price as u64).checked_div(10_u64.pow(expo_abs - 6))
                .ok_or(ErrorCode::MathOverflow)?
        } else {
            // Price has fewer decimals, multiply
            (price as u64).checked_mul(10_u64.pow(6 - expo_abs))
                .ok_or(ErrorCode::MathOverflow)?
        }
    } else {
        (price as u64).checked_mul(10_u64.pow(expo as u32))
            .ok_or(ErrorCode::MathOverflow)?
            .checked_mul(1_000_000)
            .ok_or(ErrorCode::MathOverflow)?
    };

    // Calculate commodity amount: (usdc_amount / price)
    let commodity_amount = (usdc_amount as u128)
        .checked_mul(1_000_000)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(price_normalized as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;

    msg!("Swapping {} USDC for {} {:?} tokens", usdc_amount, commodity_amount, commodity_type);
    msg!("Price: {} (expo: {})", price, expo);

    // Transfer USDC from user to vault
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_usdc_account.to_account_info(),
            to: ctx.accounts.usdc_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, usdc_amount)?;

    // Mint commodity tokens to user
    let seeds = &[
        POOL_SEED,
        &[pool.bump],
    ];
    let signer = &[&seeds[..]];

    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.commodity_mint.to_account_info(),
            to: ctx.accounts.user_commodity_account.to_account_info(),
            authority: pool.to_account_info(),
        },
        signer,
    );
    token::mint_to(mint_ctx, commodity_amount)?;

    msg!("Swap completed successfully!");

    Ok(())
}
