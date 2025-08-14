use crate::error::CustomError;
use crate::state::loyalty::{
    EarnLoyaltyPoints, GiftLoyaltyPoints, InitializeLoyaltyAccount, InitializeLoyaltyProgram,
    LoyaltyAccount, LoyaltyPointsEarned, LoyaltyPointsGifted, LoyaltyPointsRedeemed,
    LoyaltyProgram, LoyaltyProgramUpdated, LoyaltyTierChanged, LoyaltyTransaction,
    RedeemLoyaltyPoints, UpdateLoyaltyProgram,
};
use crate::types::{LoyaltyPointType, LoyaltyTier, LoyaltyTransactionType};
use anchor_lang::prelude::*;

/// Configuration for loyalty system
pub struct LoyaltyConfig {
    pub default_points_per_dollar: u64, // Default points per dollar (100 = 1 point per dollar)
    pub default_redemption_rate: u64,   // Points needed for $1 (100 = 100 points = $1)
    pub default_welcome_bonus: u64,     // Default welcome bonus
    pub default_referral_bonus: u64,    // Default referral bonus
    pub default_min_redemption: u64,    // Default minimum redemption
    pub default_max_redemption_percent: u16, // Default max redemption percentage (5000 = 50%)
    pub max_gift_amount: u64,           // Maximum points that can be gifted at once
}

impl Default for LoyaltyConfig {
    fn default() -> Self {
        Self {
            default_points_per_dollar: 10, // 10 points per SOL (10 * 1_000_000_000 / 1_000_000_000 = 10 points per SOL)
            default_redemption_rate: 100,  // 100 points = $1
            default_welcome_bonus: 500,    // 500 welcome points
            default_referral_bonus: 200,   // 200 referral points
            default_min_redemption: 100,   // Minimum 100 points to redeem
            default_max_redemption_percent: 5000, // Max 50% of purchase with points
            max_gift_amount: 10000,        // Max 10,000 points gift
        }
    }
}

/// Initialize a store's loyalty program
pub fn initialize_loyalty_program(
    ctx: Context<InitializeLoyaltyProgram>,
    points_per_dollar: Option<u64>,
    redemption_rate: Option<u64>,
    welcome_bonus: Option<u64>,
    referral_bonus: Option<u64>,
) -> Result<()> {
    let config = LoyaltyConfig::default();
    let loyalty_program = &mut ctx.accounts.loyalty_program;
    let current_time = Clock::get()?.unix_timestamp;

    loyalty_program.store = ctx.accounts.store.key();
    loyalty_program.is_active = true;
    loyalty_program.points_per_dollar =
        points_per_dollar.unwrap_or(config.default_points_per_dollar);
    loyalty_program.redemption_rate = redemption_rate.unwrap_or(config.default_redemption_rate);
    loyalty_program.welcome_bonus = welcome_bonus.unwrap_or(config.default_welcome_bonus);
    loyalty_program.referral_bonus = referral_bonus.unwrap_or(config.default_referral_bonus);
    loyalty_program.min_redemption = config.default_min_redemption;
    loyalty_program.max_redemption_percent = config.default_max_redemption_percent;
    loyalty_program.point_expiry_days = 0; // Never expire by default
    loyalty_program.tier_multiplier_enabled = true;
    loyalty_program.created_at = current_time;
    loyalty_program.updated_at = current_time;

    emit!(LoyaltyProgramUpdated {
        store: ctx.accounts.store.key(),
        points_per_dollar: loyalty_program.points_per_dollar,
        redemption_rate: loyalty_program.redemption_rate,
        updated_at: current_time,
    });

    msg!(
        "Loyalty program initialized for store: {}",
        ctx.accounts.store.key()
    );
    Ok(())
}

/// Initialize a user's loyalty account for a specific store
pub fn initialize_loyalty_account(
    ctx: Context<InitializeLoyaltyAccount>,
    referral_code: Option<[u8; 8]>,
    referred_by: Option<Pubkey>,
) -> Result<()> {
    let loyalty_account = &mut ctx.accounts.loyalty_account;
    let loyalty_program = &ctx.accounts.loyalty_program;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate loyalty program is active
    require!(
        loyalty_program.is_active,
        CustomError::LoyaltyProgramInactive
    );

    // Generate referral code if not provided
    let user_referral_code = referral_code.unwrap_or_else(|| {
        let user_key = ctx.accounts.user.key();
        let mut code = [0u8; 8];
        code.copy_from_slice(&user_key.to_bytes()[0..8]);
        code
    });

    loyalty_account.user = ctx.accounts.user.key();
    loyalty_account.store = ctx.accounts.store.key();
    loyalty_account.total_points = 0;
    loyalty_account.available_points = 0;
    loyalty_account.redeemed_points = 0;
    loyalty_account.expired_points = 0;
    loyalty_account.tier = LoyaltyTier::Bronze;
    loyalty_account.tier_progress = 0;
    loyalty_account.last_purchase_date = 0;
    loyalty_account.created_at = current_time;
    loyalty_account.referral_code = user_referral_code;
    loyalty_account.referred_by = referred_by;
    loyalty_account.total_referrals = 0;

    // Award welcome bonus
    if loyalty_program.welcome_bonus > 0 {
        loyalty_account.add_points(loyalty_program.welcome_bonus, LoyaltyPointType::Welcome)?;

        emit!(LoyaltyPointsEarned {
            user: ctx.accounts.user.key(),
            store: ctx.accounts.store.key(),
            points_earned: loyalty_program.welcome_bonus,
            point_type: LoyaltyPointType::Welcome,
            new_total: loyalty_account.total_points,
            new_tier: loyalty_account.tier,
            purchase_amount: 0,
            timestamp: current_time,
        });
    }

    msg!(
        "Loyalty account initialized for user: {} at store: {}",
        ctx.accounts.user.key(),
        ctx.accounts.store.key()
    );
    Ok(())
}

/// Earn loyalty points from a purchase
pub fn earn_loyalty_points(
    ctx: Context<EarnLoyaltyPoints>,
    purchase_amount: u64,
    point_type: LoyaltyPointType,
) -> Result<()> {
    let loyalty_account = &mut ctx.accounts.loyalty_account;
    let loyalty_program = &ctx.accounts.loyalty_program;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate loyalty program is active
    require!(
        loyalty_program.is_active,
        CustomError::LoyaltyProgramInactive
    );

    // Calculate points to earn
    let points_to_earn = match point_type {
        LoyaltyPointType::Purchase => {
            loyalty_program.calculate_points_earned(purchase_amount, loyalty_account.tier)
        }
        LoyaltyPointType::Referral => loyalty_program.referral_bonus,
        LoyaltyPointType::Bonus => purchase_amount, // For bonus, amount represents points directly
        LoyaltyPointType::Welcome => loyalty_program.welcome_bonus,
    };

    let old_tier = loyalty_account.tier;

    // Add points to account
    loyalty_account.add_points(points_to_earn, point_type)?;
    loyalty_account.last_purchase_date = current_time;

    // Check for tier change
    let tier_changed = old_tier != loyalty_account.tier;

    // Create transaction record
    let transaction_record = &mut ctx.accounts.transaction_record;
    transaction_record.user = ctx.accounts.user.key();
    transaction_record.store = ctx.accounts.store.key();
    transaction_record.transaction_type = LoyaltyTransactionType::Earned;
    transaction_record.point_type = point_type;
    transaction_record.points = points_to_earn;
    transaction_record.purchase_amount = Some(purchase_amount);
    transaction_record.description = format!("Earned {} points from purchase", points_to_earn);
    transaction_record.timestamp = current_time;
    transaction_record.related_user = None;

    // Emit events
    emit!(LoyaltyPointsEarned {
        user: ctx.accounts.user.key(),
        store: ctx.accounts.store.key(),
        points_earned: points_to_earn,
        point_type,
        new_total: loyalty_account.total_points,
        new_tier: loyalty_account.tier,
        purchase_amount,
        timestamp: current_time,
    });

    if tier_changed {
        emit!(LoyaltyTierChanged {
            user: ctx.accounts.user.key(),
            store: ctx.accounts.store.key(),
            old_tier,
            new_tier: loyalty_account.tier,
            total_points: loyalty_account.total_points,
            timestamp: current_time,
        });
    }

    msg!(
        "User {} earned {} {} points. New total: {}, Tier: {:?}",
        ctx.accounts.user.key(),
        points_to_earn,
        format!("{:?}", point_type),
        loyalty_account.total_points,
        loyalty_account.tier
    );

    Ok(())
}

/// Redeem loyalty points for purchase discount
pub fn redeem_loyalty_points(
    ctx: Context<RedeemLoyaltyPoints>,
    points_to_redeem: u64,
    total_purchase_amount: u64,
) -> Result<u64> {
    let loyalty_account = &mut ctx.accounts.loyalty_account;
    let loyalty_program = &ctx.accounts.loyalty_program;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate loyalty program is active
    require!(
        loyalty_program.is_active,
        CustomError::LoyaltyProgramInactive
    );

    // Validate redemption amount
    require!(
        loyalty_program.can_redeem_amount(points_to_redeem, total_purchase_amount),
        CustomError::InvalidLoyaltyPoints
    );

    // Validate user has enough points
    require!(
        loyalty_account.can_redeem(points_to_redeem),
        CustomError::InsufficientLoyaltyPoints
    );

    // Calculate redemption value
    let redemption_value = loyalty_program.calculate_point_value(points_to_redeem);

    // Redeem points
    loyalty_account.redeem_points(points_to_redeem)?;

    // Create transaction record
    let transaction_record = &mut ctx.accounts.transaction_record;
    transaction_record.user = ctx.accounts.user.key();
    transaction_record.store = ctx.accounts.store.key();
    transaction_record.transaction_type = LoyaltyTransactionType::Redeemed;
    transaction_record.point_type = LoyaltyPointType::Purchase; // Default for redemptions
    transaction_record.points = points_to_redeem;
    transaction_record.purchase_amount = Some(total_purchase_amount);
    transaction_record.description = format!(
        "Redeemed {} points for {} lamports",
        points_to_redeem, redemption_value
    );
    transaction_record.timestamp = current_time;
    transaction_record.related_user = None;

    emit!(LoyaltyPointsRedeemed {
        user: ctx.accounts.user.key(),
        store: ctx.accounts.store.key(),
        points_redeemed: points_to_redeem,
        value_redeemed: redemption_value,
        remaining_points: loyalty_account.available_points,
        timestamp: current_time,
    });

    msg!(
        "User {} redeemed {} points for {} lamports value. Remaining: {} points",
        ctx.accounts.user.key(),
        points_to_redeem,
        redemption_value,
        loyalty_account.available_points
    );

    Ok(redemption_value)
}

/// Update loyalty program settings
pub fn update_loyalty_program(
    ctx: Context<UpdateLoyaltyProgram>,
    points_per_dollar: Option<u64>,
    redemption_rate: Option<u64>,
    welcome_bonus: Option<u64>,
    referral_bonus: Option<u64>,
    min_redemption: Option<u64>,
    max_redemption_percent: Option<u16>,
    is_active: Option<bool>,
) -> Result<()> {
    let loyalty_program = &mut ctx.accounts.loyalty_program;
    let current_time = Clock::get()?.unix_timestamp;

    if let Some(ppd) = points_per_dollar {
        loyalty_program.points_per_dollar = ppd;
    }
    if let Some(rr) = redemption_rate {
        loyalty_program.redemption_rate = rr;
    }
    if let Some(wb) = welcome_bonus {
        loyalty_program.welcome_bonus = wb;
    }
    if let Some(rb) = referral_bonus {
        loyalty_program.referral_bonus = rb;
    }
    if let Some(mr) = min_redemption {
        loyalty_program.min_redemption = mr;
    }
    if let Some(mrp) = max_redemption_percent {
        loyalty_program.max_redemption_percent = mrp;
    }
    if let Some(active) = is_active {
        loyalty_program.is_active = active;
    }

    loyalty_program.updated_at = current_time;

    emit!(LoyaltyProgramUpdated {
        store: ctx.accounts.store.key(),
        points_per_dollar: loyalty_program.points_per_dollar,
        redemption_rate: loyalty_program.redemption_rate,
        updated_at: current_time,
    });

    msg!(
        "Loyalty program updated for store: {}",
        ctx.accounts.store.key()
    );
    Ok(())
}

/// Gift loyalty points to another user
pub fn gift_loyalty_points(
    ctx: Context<GiftLoyaltyPoints>,
    points_to_gift: u64,
    message: String,
) -> Result<()> {
    let config = LoyaltyConfig::default();
    let sender_account = &mut ctx.accounts.sender_loyalty_account;
    let recipient_account = &mut ctx.accounts.recipient_loyalty_account;
    let loyalty_program = &ctx.accounts.loyalty_program;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate loyalty program is active
    require!(
        loyalty_program.is_active,
        CustomError::LoyaltyProgramInactive
    );

    // Validate gift amount
    require!(
        points_to_gift <= config.max_gift_amount,
        CustomError::InvalidLoyaltyPoints
    );

    // Validate sender owns the account
    require!(
        sender_account.user == ctx.accounts.sender.key(),
        CustomError::Unauthorized
    );

    // Validate sender has enough points
    require!(
        sender_account.can_redeem(points_to_gift),
        CustomError::InsufficientLoyaltyPoints
    );

    // Transfer points
    sender_account.redeem_points(points_to_gift)?;
    recipient_account.add_points(points_to_gift, LoyaltyPointType::Bonus)?;

    // Create transaction records
    let sender_transaction = &mut ctx.accounts.sender_transaction;
    sender_transaction.user = ctx.accounts.sender.key();
    sender_transaction.store = ctx.accounts.store.key();
    sender_transaction.transaction_type = LoyaltyTransactionType::Gifted;
    sender_transaction.point_type = LoyaltyPointType::Bonus;
    sender_transaction.points = points_to_gift;
    sender_transaction.purchase_amount = None;
    sender_transaction.description = format!("Gifted {} points: {}", points_to_gift, message);
    sender_transaction.timestamp = current_time;
    sender_transaction.related_user = Some(recipient_account.user);

    let recipient_transaction = &mut ctx.accounts.recipient_transaction;
    recipient_transaction.user = recipient_account.user;
    recipient_transaction.store = ctx.accounts.store.key();
    recipient_transaction.transaction_type = LoyaltyTransactionType::Received;
    recipient_transaction.point_type = LoyaltyPointType::Bonus;
    recipient_transaction.points = points_to_gift;
    recipient_transaction.purchase_amount = None;
    recipient_transaction.description = format!("Received {} points: {}", points_to_gift, message);
    recipient_transaction.timestamp = current_time;
    recipient_transaction.related_user = Some(ctx.accounts.sender.key());

    emit!(LoyaltyPointsGifted {
        sender: ctx.accounts.sender.key(),
        recipient: recipient_account.user,
        store: ctx.accounts.store.key(),
        points_gifted: points_to_gift,
        timestamp: current_time,
    });

    msg!(
        "User {} gifted {} points to user {}",
        ctx.accounts.sender.key(),
        points_to_gift,
        recipient_account.user
    );

    Ok(())
}

/// Award referral bonus when someone is referred
pub fn award_referral_bonus(ctx: Context<EarnLoyaltyPoints>, referred_user: Pubkey) -> Result<()> {
    let loyalty_account = &mut ctx.accounts.loyalty_account;
    let loyalty_program = &ctx.accounts.loyalty_program;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate loyalty program is active
    require!(
        loyalty_program.is_active,
        CustomError::LoyaltyProgramInactive
    );

    // Award referral bonus
    let referral_points = loyalty_program.referral_bonus;
    loyalty_account.add_points(referral_points, LoyaltyPointType::Referral)?;
    loyalty_account.total_referrals += 1;

    // Create transaction record
    let transaction_record = &mut ctx.accounts.transaction_record;
    transaction_record.user = ctx.accounts.user.key();
    transaction_record.store = ctx.accounts.store.key();
    transaction_record.transaction_type = LoyaltyTransactionType::Earned;
    transaction_record.point_type = LoyaltyPointType::Referral;
    transaction_record.points = referral_points;
    transaction_record.purchase_amount = None;
    transaction_record.description = format!("Referral bonus for referring user");
    transaction_record.timestamp = current_time;
    transaction_record.related_user = Some(referred_user);

    emit!(LoyaltyPointsEarned {
        user: ctx.accounts.user.key(),
        store: ctx.accounts.store.key(),
        points_earned: referral_points,
        point_type: LoyaltyPointType::Referral,
        new_total: loyalty_account.total_points,
        new_tier: loyalty_account.tier,
        purchase_amount: 0,
        timestamp: current_time,
    });

    msg!(
        "User {} earned {} referral points for referring {}",
        ctx.accounts.user.key(),
        referral_points,
        referred_user
    );

    Ok(())
}

/// Deduct loyalty points for refunds
pub fn deduct_loyalty_points(
    ctx: Context<EarnLoyaltyPoints>, // Reuse same context structure
    refund_amount: u64,
    point_type: LoyaltyPointType,
) -> Result<()> {
    let loyalty_account = &mut ctx.accounts.loyalty_account;
    let loyalty_program = &ctx.accounts.loyalty_program;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate loyalty program is active
    require!(
        loyalty_program.is_active,
        CustomError::LoyaltyProgramInactive
    );

    // Calculate points to deduct based on refund amount
    let points_to_deduct = refund_amount
        .checked_mul(loyalty_program.points_per_dollar)
        .unwrap_or(0)
        .checked_div(1_000_000_000) // Convert lamports to SOL
        .unwrap_or(0);

    // Validate user has enough points to deduct (but allow partial deduction)
    let actual_deduction = std::cmp::min(loyalty_account.total_points, points_to_deduct);
    
    // Only proceed if there are points to deduct
    if actual_deduction > 0 {
        // Deduct points
        loyalty_account.total_points = loyalty_account.total_points.saturating_sub(actual_deduction);
        
        // Update tier if necessary
        loyalty_account.update_tier();

        // Create transaction record for the deduction
        let transaction_record = &mut ctx.accounts.transaction_record;
        transaction_record.user = ctx.accounts.user.key();
        transaction_record.store = ctx.accounts.store.key();
        transaction_record.transaction_type = LoyaltyTransactionType::Earned; // Use existing variant for now
        transaction_record.point_type = point_type;
        transaction_record.points = actual_deduction;
        transaction_record.purchase_amount = Some(refund_amount);
        transaction_record.description = format!("Points deducted for refund of {} SOL", refund_amount as f64 / 1_000_000_000.0);
        transaction_record.timestamp = current_time;
        transaction_record.related_user = None;

        // Emit event for point deduction
        emit!(LoyaltyPointsEarned {
            user: ctx.accounts.user.key(),
            store: ctx.accounts.store.key(),
            points_earned: actual_deduction, // We'll handle the negative logic in frontend
            point_type,
            new_total: loyalty_account.total_points,
            new_tier: loyalty_account.tier,
            purchase_amount: refund_amount,
            timestamp: current_time,
        });

        msg!(
            "User {} had {} loyalty points deducted for refund of {} SOL. New total: {}",
            ctx.accounts.user.key(),
            actual_deduction,
            refund_amount as f64 / 1_000_000_000.0,
            loyalty_account.total_points
        );
    } else {
        msg!(
            "User {} has no points to deduct for refund of {} SOL",
            ctx.accounts.user.key(),
            refund_amount as f64 / 1_000_000_000.0
        );
    }

    Ok(())
}
