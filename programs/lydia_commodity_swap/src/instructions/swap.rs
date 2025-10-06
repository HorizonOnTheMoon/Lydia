use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Transfer};
use crate::state::{CommodityPool, CommodityType};
use crate::error::ErrorCode;
use crate::constants::*;
use crate::utils::pyth::{get_pyth_price, calculate_commodity_amount};

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

    /// Pyth price update account
    /// CHECK: Validated in instruction logic using Pyth SDK
    pub price_update: AccountInfo<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
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

    // Get price feed ID for this commodity
    let feed_id = commodity_type.get_price_feed_id();

    // Get real-time price from Pyth Oracle
    let pyth_price = get_pyth_price(
        &ctx.accounts.price_update,
        feed_id,
        &ctx.accounts.clock,
    )?;

    msg!("Pyth Oracle Price for {:?}: {} x 10^{}", commodity_type, pyth_price.price, pyth_price.expo);

    // Calculate commodity amount using Pyth price
    let commodity_amount = calculate_commodity_amount(usdc_amount, &pyth_price)?;

    msg!("Swapping {} USDC for {} {:?} tokens", usdc_amount, commodity_amount, commodity_type);

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
