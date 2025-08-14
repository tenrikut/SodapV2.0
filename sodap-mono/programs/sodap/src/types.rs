// Moved from state/types.rs
// Please add your types here, or move the content from state/types.rs

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum AdminRoleType {
    Owner,
    Manager,
    Viewer,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum TokenizedType {
    NonFungible,
    Fungible,
    None,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum TransactionStatus {
    Pending,
    Completed,
    Failed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum AnomalyFlag {
    None,
    Suspicious,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum PaymentMethod {
    FullPayment, // Traditional full payment upfront
    BNPL,        // Buy Now, Pay Later
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum BnplLoanStatus {
    Active,         // Loan is active with pending payments
    Completed,      // All payments made successfully
    DefaultedGrace, // Missed payment but in grace period
    Defaulted,      // Loan defaulted, needs liquidation
    Liquidated,     // Loan has been liquidated
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum BnplTerm {
    ThreeMonths,  // 3 monthly payments
    SixMonths,    // 6 monthly payments
    TwelveMonths, // 12 monthly payments
}

impl BnplTerm {
    pub fn to_months(&self) -> u8 {
        match self {
            BnplTerm::ThreeMonths => 3,
            BnplTerm::SixMonths => 6,
            BnplTerm::TwelveMonths => 12,
        }
    }

    pub fn to_seconds(&self) -> i64 {
        // Approximate seconds in a month (30 days)
        const SECONDS_PER_MONTH: i64 = 30 * 24 * 60 * 60;
        SECONDS_PER_MONTH * self.to_months() as i64
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum LoyaltyPointType {
    Purchase, // Points earned from purchases
    Referral, // Points earned from referring others
    Bonus,    // Bonus points from promotions
    Welcome,  // Welcome bonus points
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum LoyaltyTier {
    Bronze,   // Basic tier
    Silver,   // Mid tier
    Gold,     // High tier
    Platinum, // Premium tier
}

impl LoyaltyTier {
    pub fn required_points(&self) -> u64 {
        match self {
            LoyaltyTier::Bronze => 0,
            LoyaltyTier::Silver => 1000,
            LoyaltyTier::Gold => 5000,
            LoyaltyTier::Platinum => 15000,
        }
    }

    pub fn multiplier(&self) -> f32 {
        match self {
            LoyaltyTier::Bronze => 1.0,
            LoyaltyTier::Silver => 1.2,
            LoyaltyTier::Gold => 1.5,
            LoyaltyTier::Platinum => 2.0,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum LoyaltyTransactionType {
    Earned,   // Points earned
    Redeemed, // Points redeemed
    Expired,  // Points expired
    Gifted,   // Points gifted to another user
    Received, // Points received from another user
}
