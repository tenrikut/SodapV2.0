use crate::error::CustomError;
use crate::types::{Currency, StablePrice};
use anchor_lang::prelude::*;

/// Price conversion utilities for SODAP v2.0
pub struct PriceConverter;

impl PriceConverter {
    /// Convert USDC to SOL using current exchange rate
    /// USDC has 6 decimals, SOL has 9 decimals
    pub fn usdc_to_sol(usdc_amount: u64, sol_price_in_usdc: u64) -> Result<u64> {
        if sol_price_in_usdc == 0 {
            return Err(CustomError::ArithmeticError.into());
        }
        
        // Convert USDC (6 decimals) to SOL (9 decimals)
        // Formula: (usdc_amount * 10^9) / sol_price_in_usdc
        let sol_amount = usdc_amount
            .checked_mul(1_000_000_000) // Convert to 9 decimal places for SOL
            .ok_or(CustomError::ArithmeticError)?
            .checked_div(sol_price_in_usdc) // sol_price already has 6 decimals
            .ok_or(CustomError::ArithmeticError)?;
            
        Ok(sol_amount)
    }
    
    /// Convert SOL to USDC using current exchange rate
    /// SOL has 9 decimals, USDC has 6 decimals
    pub fn sol_to_usdc(sol_amount: u64, sol_price_in_usdc: u64) -> Result<u64> {
        // Formula: (sol_amount * sol_price_in_usdc) / 10^9 * 10^6 = (sol_amount * sol_price_in_usdc) / 10^3
        let usdc_amount = sol_amount
            .checked_mul(sol_price_in_usdc)
            .ok_or(CustomError::ArithmeticError)?
            .checked_div(1_000_000_000) // Remove 9 decimal places from SOL
            .ok_or(CustomError::ArithmeticError)?;
            
        Ok(usdc_amount)
    }
    
    /// Get price in specified currency from StablePrice
    pub fn get_price_in_currency(stable_price: &StablePrice, currency: Currency) -> u64 {
        match currency {
            Currency::SOL => stable_price.sol_price,
            Currency::USDC => stable_price.usdc_price,
        }
    }
    
    /// Calculate total price for multiple products in specified currency
    pub fn calculate_total_price(
        stable_prices: &[StablePrice],
        quantities: &[u64],
        currency: Currency,
    ) -> Result<u64> {
        if stable_prices.len() != quantities.len() {
            return Err(CustomError::InvalidCart.into());
        }
        
        let mut total_price = 0u64;
        
        for (price, quantity) in stable_prices.iter().zip(quantities.iter()) {
            let unit_price = Self::get_price_in_currency(price, currency);
            let item_total = unit_price
                .checked_mul(*quantity)
                .ok_or(CustomError::ArithmeticError)?;
            total_price = total_price
                .checked_add(item_total)
                .ok_or(CustomError::ArithmeticError)?;
        }
        
        Ok(total_price)
    }
    
    /// Check if pricing data is stale (older than 1 hour)
    pub fn is_pricing_stale(stable_price: &StablePrice, current_timestamp: i64) -> bool {
        if stable_price.is_fixed {
            return false; // Fixed prices never go stale
        }
        
        const ONE_HOUR: i64 = 3600; // 1 hour in seconds
        current_timestamp - stable_price.last_updated > ONE_HOUR
    }
    
    /// Format price for display (adds decimal places)
    pub fn format_price_for_display(price: u64, currency: Currency) -> String {
        match currency {
            Currency::SOL => {
                let sol_price = price as f64 / 1_000_000_000.0; // 9 decimals
                format!("{:.4} SOL", sol_price)
            }
            Currency::USDC => {
                let usdc_price = price as f64 / 1_000_000.0; // 6 decimals
                format!("${:.2}", usdc_price)
            }
        }
    }
    
    /// Parse price from display format to raw format
    pub fn parse_price_from_display(price_str: &str, currency: Currency) -> Result<u64> {
        let binding = price_str.replace("$", "").replace(" SOL", "");
        let clean_str = binding.trim();
        let price_float: f64 = clean_str.parse().map_err(|_| CustomError::ArithmeticError)?;
        
        let raw_price = match currency {
            Currency::SOL => (price_float * 1_000_000_000.0) as u64, // 9 decimals
            Currency::USDC => (price_float * 1_000_000.0) as u64,    // 6 decimals
        };
        
        Ok(raw_price)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_usdc_to_sol_conversion() {
        // Assume 1 SOL = $100 USDC
        let sol_price_usdc = 100_000_000; // $100 with 6 decimals
        let usdc_amount = 50_000_000; // $50 with 6 decimals
        
        let sol_amount = PriceConverter::usdc_to_sol(usdc_amount, sol_price_usdc).unwrap();
        // Should get 0.5 SOL = 500_000_000 lamports
        // Formula: (50_000_000 * 1_000_000_000) / 100_000_000 = 500_000_000
        assert_eq!(sol_amount, 500_000_000);
    }
    
    #[test]
    fn test_sol_to_usdc_conversion() {
        // Assume 1 SOL = $100 USDC
        let sol_price_usdc = 100_000_000; // $100 with 6 decimals
        let sol_amount = 500_000_000; // 0.5 SOL with 9 decimals
        
        let usdc_amount = PriceConverter::sol_to_usdc(sol_amount, sol_price_usdc).unwrap();
        // Should get $50 = 50_000_000 with 6 decimals
        // Formula: (500_000_000 * 100_000_000) / 1_000_000_000 = 50_000_000_000_000_000 / 1_000_000_000 = 50_000_000
        assert_eq!(usdc_amount, 50_000_000);
    }
    
    #[test]
    fn test_price_formatting() {
        assert_eq!(
            PriceConverter::format_price_for_display(1_000_000_000, Currency::SOL),
            "1.0000 SOL"
        );
        assert_eq!(
            PriceConverter::format_price_for_display(50_000_000, Currency::USDC),
            "$50.00"
        );
    }
}
