use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};
use crate::error::ErrorCode;

const STALENESS_THRESHOLD: u64 = 60; // 60 seconds

pub struct PythPrice {
    pub price: i64,
    pub expo: i32,
    pub conf: u64,
}

/// Get price from Pyth price feed account
pub fn get_pyth_price(
    price_update_account: &AccountInfo,
    feed_id_hex: &str,
    clock: &Clock,
) -> Result<PythPrice> {
    // Load the price update account
    let price_update = PriceUpdateV2::try_deserialize(&mut &price_update_account.data.borrow()[..])?;

    // Get the feed ID
    let feed_id = get_feed_id_from_hex(feed_id_hex)
        .map_err(|_| ErrorCode::InvalidPythAccount)?;

    // Get the price for this feed
    let price_feed = price_update
        .get_price_no_older_than(&clock, STALENESS_THRESHOLD, &feed_id)
        .map_err(|_| ErrorCode::StalePriceFeed)?;

    // Validate price is positive
    require!(price_feed.price > 0, ErrorCode::InvalidPrice);

    msg!("Pyth Price: {} x 10^{}", price_feed.price, price_feed.exponent);
    msg!("Confidence: {}", price_feed.conf);

    Ok(PythPrice {
        price: price_feed.price,
        expo: price_feed.exponent,
        conf: price_feed.conf,
    })
}

/// Calculate token amount from USDC amount and price
/// USDC has 6 decimals, commodity tokens have 6 decimals
pub fn calculate_commodity_amount(
    usdc_amount: u64,
    pyth_price: &PythPrice,
) -> Result<u64> {
    let price = pyth_price.price;
    let expo = pyth_price.expo;

    // Normalize price to 6 decimals (same as USDC and commodity tokens)
    let price_normalized = if expo < 0 {
        let expo_abs = (-expo) as u32;
        if expo_abs >= 6 {
            // Price has more decimals than we need, divide
            (price as u64)
                .checked_div(10_u64.pow(expo_abs - 6))
                .ok_or(ErrorCode::MathOverflow)?
        } else {
            // Price has fewer decimals, multiply
            (price as u64)
                .checked_mul(10_u64.pow(6 - expo_abs))
                .ok_or(ErrorCode::MathOverflow)?
        }
    } else {
        // Positive exponent - multiply price
        (price as u64)
            .checked_mul(10_u64.pow(expo as u32))
            .ok_or(ErrorCode::MathOverflow)?
            .checked_mul(1_000_000)
            .ok_or(ErrorCode::MathOverflow)?
    };

    // Calculate commodity amount: (usdc_amount / price) * 1_000_000
    // Using 128-bit arithmetic to prevent overflow
    let commodity_amount = (usdc_amount as u128)
        .checked_mul(1_000_000)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(price_normalized as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;

    Ok(commodity_amount)
}
