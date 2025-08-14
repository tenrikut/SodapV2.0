use super::store::Store;
use crate::error::CustomError;
use crate::types::{LoyaltyPointType, LoyaltyTier, LoyaltyTransactionType};
use anchor_lang::prelude::*;

#[account]
pub struct LoyaltyAccount {
    pub user: Pubkey,                // User's wallet
    pub store: Pubkey,               // Store this account belongs to
    pub total_points: u64,           // Total points earned all time
    pub available_points: u64,       // Currently available points
    pub redeemed_points: u64,        // Total points redeemed
    pub expired_points: u64,         // Total points expired
    pub tier: LoyaltyTier,           // Current loyalty tier
    pub tier_progress: u64,          // Points towards next tier
    pub last_purchase_date: i64,     // Last purchase timestamp
    pub created_at: i64,             // Account creation timestamp
    pub referral_code: [u8; 8],      // User's referral code
    pub referred_by: Option<Pubkey>, // Who referred this user
    pub total_referrals: u16,        // Number of successful referrals
}

impl LoyaltyAccount {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 8 + 8 + (1 + 32) + 2;

    /// Calculate and update user's loyalty tier
    pub fn update_tier(&mut self) {
        let new_tier = if self.total_points >= LoyaltyTier::Platinum.required_points() {
            LoyaltyTier::Platinum
        } else if self.total_points >= LoyaltyTier::Gold.required_points() {
            LoyaltyTier::Gold
        } else if self.total_points >= LoyaltyTier::Silver.required_points() {
            LoyaltyTier::Silver
        } else {
            LoyaltyTier::Bronze
        };

        self.tier = new_tier;

        // Calculate progress towards next tier
        let next_tier_requirement = match new_tier {
            LoyaltyTier::Bronze => LoyaltyTier::Silver.required_points(),
            LoyaltyTier::Silver => LoyaltyTier::Gold.required_points(),
            LoyaltyTier::Gold => LoyaltyTier::Platinum.required_points(),
            LoyaltyTier::Platinum => LoyaltyTier::Platinum.required_points(), // Already at max
        };

        self.tier_progress = if new_tier == LoyaltyTier::Platinum {
            0 // Already at max tier
        } else {
            self.total_points - new_tier.required_points()
        };
    }

    /// Check if user can redeem specified points
    pub fn can_redeem(&self, points: u64) -> bool {
        self.available_points >= points
    }

    /// Add points to the account
    pub fn add_points(&mut self, points: u64, point_type: LoyaltyPointType) -> Result<()> {
        self.total_points = self
            .total_points
            .checked_add(points)
            .ok_or(CustomError::ArithmeticError)?;

        self.available_points = self
            .available_points
            .checked_add(points)
            .ok_or(CustomError::ArithmeticError)?;

        self.update_tier();
        Ok(())
    }

    /// Redeem points from the account
    pub fn redeem_points(&mut self, points: u64) -> Result<()> {
        require!(
            self.can_redeem(points),
            CustomError::InsufficientLoyaltyPoints
        );

        self.available_points = self
            .available_points
            .checked_sub(points)
            .ok_or(CustomError::ArithmeticError)?;

        self.redeemed_points = self
            .redeemed_points
            .checked_add(points)
            .ok_or(CustomError::ArithmeticError)?;

        Ok(())
    }
}

#[account]
pub struct LoyaltyProgram {
    pub store: Pubkey,                 // Store this program belongs to
    pub is_active: bool,               // Whether the program is active
    pub points_per_dollar: u64,        // Points earned per dollar spent (in lamports)
    pub redemption_rate: u64,          // Points needed for 1 dollar value (in lamports)
    pub welcome_bonus: u64,            // Welcome bonus points
    pub referral_bonus: u64,           // Referral bonus points
    pub min_redemption: u64,           // Minimum points for redemption
    pub max_redemption_percent: u16,   // Max % of purchase that can be paid with points
    pub point_expiry_days: u32,        // Days until points expire (0 = never)
    pub tier_multiplier_enabled: bool, // Whether tier multipliers are enabled
    pub created_at: i64,               // Program creation timestamp
    pub updated_at: i64,               // Last update timestamp
}

impl LoyaltyProgram {
    pub const LEN: usize = 8 + 32 + 1 + 8 + 8 + 8 + 8 + 8 + 2 + 4 + 1 + 8 + 8;

    /// Calculate points earned for a purchase amount
    pub fn calculate_points_earned(&self, amount_spent: u64, tier: LoyaltyTier) -> u64 {
        let base_points = (amount_spent * self.points_per_dollar) / 1_000_000_000; // Convert from lamports

        if self.tier_multiplier_enabled {
            (base_points as f32 * tier.multiplier()) as u64
        } else {
            base_points
        }
    }

    /// Calculate the value of points in lamports
    pub fn calculate_point_value(&self, points: u64) -> u64 {
        (points * 1_000_000_000) / self.redemption_rate // Convert to lamports
    }

    /// Check if redemption amount is valid
    pub fn can_redeem_amount(&self, points: u64, total_purchase: u64) -> bool {
        if points < self.min_redemption {
            return false;
        }

        let redemption_value = self.calculate_point_value(points);
        let max_allowed = (total_purchase * self.max_redemption_percent as u64) / 10000; // Convert from basis points

        redemption_value <= max_allowed
    }
}

#[account]
pub struct LoyaltyTransaction {
    pub user: Pubkey,                             // User involved in transaction
    pub store: Pubkey,                            // Store where transaction occurred
    pub transaction_type: LoyaltyTransactionType, // Type of transaction
    pub point_type: LoyaltyPointType,             // Type of points involved
    pub points: u64,                              // Number of points
    pub purchase_amount: Option<u64>,             // Related purchase amount (if applicable)
    pub description: String,                      // Transaction description
    pub timestamp: i64,                           // Transaction timestamp
    pub related_user: Option<Pubkey>,             // Related user (for gifts/referrals)
}

impl LoyaltyTransaction {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 8 + (1 + 8) + (4 + 100) + 8 + (1 + 32);
}

#[derive(Accounts)]
pub struct InitializeLoyaltyProgram<'info> {
    #[account(
        init,
        payer = store_owner,
        space = LoyaltyProgram::LEN,
        seeds = [b"loyalty_program", store.key().as_ref()],
        bump
    )]
    pub loyalty_program: Account<'info, LoyaltyProgram>,

    #[account(mut)]
    pub store: Account<'info, Store>,

    #[account(
        mut,
        constraint = store_owner.key() == store.owner @ CustomError::Unauthorized
    )]
    pub store_owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeLoyaltyAccount<'info> {
    #[account(
        init,
        payer = user,
        space = LoyaltyAccount::LEN,
        seeds = [b"loyalty_account", store.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub loyalty_account: Account<'info, LoyaltyAccount>,

    #[account(mut)]
    pub store: Account<'info, Store>,

    #[account(
        seeds = [b"loyalty_program", store.key().as_ref()],
        bump
    )]
    pub loyalty_program: Account<'info, LoyaltyProgram>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EarnLoyaltyPoints<'info> {
    #[account(
        mut,
        seeds = [b"loyalty_account", store.key().as_ref(), user.key().as_ref()],
        bump,
        has_one = user,
        has_one = store
    )]
    pub loyalty_account: Account<'info, LoyaltyAccount>,

    #[account(mut)]
    pub store: Account<'info, Store>,

    #[account(
        seeds = [b"loyalty_program", store.key().as_ref()],
        bump
    )]
    pub loyalty_program: Account<'info, LoyaltyProgram>,

    #[account(
        init,
        payer = user,
        space = LoyaltyTransaction::LEN
    )]
    pub transaction_record: Account<'info, LoyaltyTransaction>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RedeemLoyaltyPoints<'info> {
    #[account(
        mut,
        seeds = [b"loyalty_account", store.key().as_ref(), user.key().as_ref()],
        bump,
        has_one = user,
        has_one = store
    )]
    pub loyalty_account: Account<'info, LoyaltyAccount>,

    #[account(mut)]
    pub store: Account<'info, Store>,

    #[account(
        seeds = [b"loyalty_program", store.key().as_ref()],
        bump
    )]
    pub loyalty_program: Account<'info, LoyaltyProgram>,

    #[account(
        init,
        payer = user,
        space = LoyaltyTransaction::LEN
    )]
    pub transaction_record: Account<'info, LoyaltyTransaction>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateLoyaltyProgram<'info> {
    #[account(
        mut,
        seeds = [b"loyalty_program", store.key().as_ref()],
        bump,
        has_one = store
    )]
    pub loyalty_program: Account<'info, LoyaltyProgram>,

    #[account(mut)]
    pub store: Account<'info, Store>,

    #[account(
        mut,
        constraint = store_owner.key() == store.owner @ CustomError::Unauthorized
    )]
    pub store_owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct GiftLoyaltyPoints<'info> {
    #[account(
        mut,
        seeds = [b"loyalty_account", store.key().as_ref(), sender.key().as_ref()],
        bump,
        has_one = store
    )]
    pub sender_loyalty_account: Account<'info, LoyaltyAccount>,

    #[account(
        mut,
        seeds = [b"loyalty_account", store.key().as_ref(), recipient.key().as_ref()],
        bump,
        has_one = store
    )]
    pub recipient_loyalty_account: Account<'info, LoyaltyAccount>,

    #[account(mut)]
    pub store: Account<'info, Store>,

    #[account(
        seeds = [b"loyalty_program", store.key().as_ref()],
        bump
    )]
    pub loyalty_program: Account<'info, LoyaltyProgram>,

    #[account(
        init,
        payer = sender,
        space = LoyaltyTransaction::LEN
    )]
    pub sender_transaction: Account<'info, LoyaltyTransaction>,

    #[account(
        init,
        payer = sender,
        space = LoyaltyTransaction::LEN
    )]
    pub recipient_transaction: Account<'info, LoyaltyTransaction>,

    #[account(mut)]
    pub sender: Signer<'info>,

    /// CHECK: Recipient is validated through the loyalty account constraint
    pub recipient: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

/// Event emitted when loyalty points are earned
#[event]
pub struct LoyaltyPointsEarned {
    pub user: Pubkey,
    pub store: Pubkey,
    pub points_earned: u64,
    pub point_type: LoyaltyPointType,
    pub new_total: u64,
    pub new_tier: LoyaltyTier,
    pub purchase_amount: u64,
    pub timestamp: i64,
}

/// Event emitted when loyalty points are redeemed
#[event]
pub struct LoyaltyPointsRedeemed {
    pub user: Pubkey,
    pub store: Pubkey,
    pub points_redeemed: u64,
    pub value_redeemed: u64,
    pub remaining_points: u64,
    pub timestamp: i64,
}

/// Event emitted when loyalty points are gifted
#[event]
pub struct LoyaltyPointsGifted {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub store: Pubkey,
    pub points_gifted: u64,
    pub timestamp: i64,
}

/// Event emitted when user's loyalty tier changes
#[event]
pub struct LoyaltyTierChanged {
    pub user: Pubkey,
    pub store: Pubkey,
    pub old_tier: LoyaltyTier,
    pub new_tier: LoyaltyTier,
    pub total_points: u64,
    pub timestamp: i64,
}

/// Event emitted when loyalty program is updated
#[event]
pub struct LoyaltyProgramUpdated {
    pub store: Pubkey,
    pub points_per_dollar: u64,
    pub redemption_rate: u64,
    pub updated_at: i64,
}
