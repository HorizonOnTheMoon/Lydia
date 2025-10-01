use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::CommodityPool;
use crate::constants::POOL_SEED;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = CommodityPool::LEN,
        seeds = [POOL_SEED],
        bump
    )]
    pub pool: Account<'info, CommodityPool>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// USDC vault to hold received USDC
    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = pool,
    )]
    pub usdc_vault: Account<'info, TokenAccount>,

    /// USDC mint (Devnet USDC)
    pub usdc_mint: Account<'info, Mint>,

    /// Oil token mint
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = pool,
    )]
    pub oil_mint: Account<'info, Mint>,

    /// Gold token mint
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = pool,
    )]
    pub gold_mint: Account<'info, Mint>,

    /// Silver token mint
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = pool,
    )]
    pub silver_mint: Account<'info, Mint>,

    /// Natural Gas token mint
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = pool,
    )]
    pub natural_gas_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    pool.authority = ctx.accounts.authority.key();
    pool.usdc_vault = ctx.accounts.usdc_vault.key();
    pool.oil_mint = ctx.accounts.oil_mint.key();
    pool.gold_mint = ctx.accounts.gold_mint.key();
    pool.silver_mint = ctx.accounts.silver_mint.key();
    pool.natural_gas_mint = ctx.accounts.natural_gas_mint.key();
    pool.bump = ctx.bumps.pool;

    msg!("Commodity swap pool initialized!");
    msg!("Oil Mint: {}", pool.oil_mint);
    msg!("Gold Mint: {}", pool.gold_mint);
    msg!("Silver Mint: {}", pool.silver_mint);
    msg!("Natural Gas Mint: {}", pool.natural_gas_mint);

    Ok(())
}
