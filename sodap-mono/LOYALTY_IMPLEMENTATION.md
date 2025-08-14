# Loyalty System Implementation for SodapV2.0

## Overview

This document outlines the complete loyalty system implementation added to the SodapV2.0 anchor program. The loyalty system allows users to earn points from purchases, redeem points for discounts, participate in referral programs, and advance through loyalty tiers.

## Features Implemented

### 1. **Loyalty Points System**

- **Points Earning**: Users earn points from purchases based on amount spent
- **Points Redemption**: Users can redeem points for discounts during checkout
- **Tier Multipliers**: Higher tier users earn more points per purchase
- **Points Tracking**: Complete transaction history for all point activities

### 2. **Loyalty Tiers**

- **Bronze** (0+ points): 1.0x multiplier
- **Silver** (1,000+ points): 1.2x multiplier
- **Gold** (5,000+ points): 1.5x multiplier
- **Platinum** (15,000+ points): 2.0x multiplier

### 3. **Point Types**

- **Purchase Points**: Earned from regular purchases
- **Referral Points**: Earned from referring new users
- **Bonus Points**: Promotional or admin-granted points
- **Welcome Points**: One-time bonus for new users

### 4. **Social Features**

- **Referral Program**: Users get bonus points for referring others
- **Point Gifting**: Users can gift points to other users
- **Transaction History**: Complete record of all point activities

### 5. **Store Management**

- **Custom Programs**: Each store can configure their own loyalty program
- **Flexible Rates**: Configurable earning and redemption rates
- **Program Controls**: Enable/disable programs, set limits and restrictions

## Core Components

### 1. **Types** (`src/types.rs`)

```rust
// Point earning types
pub enum LoyaltyPointType {
    Purchase,    // Points earned from purchases
    Referral,    // Points earned from referring others
    Bonus,       // Bonus points from promotions
    Welcome,     // Welcome bonus points
}

// Loyalty tiers with multipliers
pub enum LoyaltyTier {
    Bronze,   // Basic tier (1.0x)
    Silver,   // Mid tier (1.2x)
    Gold,     // High tier (1.5x)
    Platinum, // Premium tier (2.0x)
}

// Transaction types for tracking
pub enum LoyaltyTransactionType {
    Earned,   // Points earned
    Redeemed, // Points redeemed
    Expired,  // Points expired
    Gifted,   // Points gifted to another user
    Received, // Points received from another user
}
```

### 2. **State Structures** (`src/state/loyalty.rs`)

#### **LoyaltyAccount**

Per-user, per-store loyalty account:

```rust
pub struct LoyaltyAccount {
    pub user: Pubkey,                    // User's wallet
    pub store: Pubkey,                   // Store this account belongs to
    pub total_points: u64,               // Total points earned all time
    pub available_points: u64,           // Currently available points
    pub redeemed_points: u64,            // Total points redeemed
    pub expired_points: u64,             // Total points expired
    pub tier: LoyaltyTier,               // Current loyalty tier
    pub tier_progress: u64,              // Points towards next tier
    pub last_purchase_date: i64,         // Last purchase timestamp
    pub created_at: i64,                 // Account creation timestamp
    pub referral_code: [u8; 8],          // User's referral code
    pub referred_by: Option<Pubkey>,     // Who referred this user
    pub total_referrals: u16,            // Number of successful referrals
}
```

#### **LoyaltyProgram**

Per-store program configuration:

```rust
pub struct LoyaltyProgram {
    pub store: Pubkey,                   // Store this program belongs to
    pub is_active: bool,                 // Whether the program is active
    pub points_per_dollar: u64,          // Points earned per dollar spent
    pub redemption_rate: u64,            // Points needed for 1 dollar value
    pub welcome_bonus: u64,              // Welcome bonus points
    pub referral_bonus: u64,             // Referral bonus points
    pub min_redemption: u64,             // Minimum points for redemption
    pub max_redemption_percent: u16,     // Max % of purchase payable with points
    pub point_expiry_days: u32,          // Days until points expire (0 = never)
    pub tier_multiplier_enabled: bool,   // Whether tier multipliers are enabled
    pub created_at: i64,                 // Program creation timestamp
    pub updated_at: i64,                 // Last update timestamp
}
```

#### **LoyaltyTransaction**

Transaction record for points activity:

```rust
pub struct LoyaltyTransaction {
    pub user: Pubkey,                    // User involved in transaction
    pub store: Pubkey,                   // Store where transaction occurred
    pub transaction_type: LoyaltyTransactionType, // Type of transaction
    pub point_type: LoyaltyPointType,    // Type of points involved
    pub points: u64,                     // Number of points
    pub purchase_amount: Option<u64>,    // Related purchase amount (if applicable)
    pub description: String,             // Transaction description
    pub timestamp: i64,                  // Transaction timestamp
    pub related_user: Option<Pubkey>,    // Related user (for gifts/referrals)
}
```

### 3. **Instructions** (`src/instructions/loyalty.rs`)

#### **initialize_loyalty_program**

- Creates a loyalty program for a store
- Configurable earning rates, redemption rates, and bonuses
- Only store owners can initialize

#### **initialize_loyalty_account**

- Creates a user's loyalty account for a specific store
- Assigns referral code and processes referrals
- Awards welcome bonus points

#### **earn_loyalty_points**

- Awards points to users after successful purchases
- Supports different point types (Purchase, Referral, Bonus, Welcome)
- Updates user tier based on total points
- Creates transaction records

#### **redeem_loyalty_points**

- Allows users to redeem points for purchase discounts
- Validates redemption limits and amounts
- Updates available points balance
- Creates transaction records

#### **update_loyalty_program**

- Allows store owners to modify program settings
- Update earning rates, redemption rates, and other parameters
- Enable/disable program features

#### **gift_loyalty_points**

- Enables users to gift points to other users
- Validates sender has sufficient points
- Creates transaction records for both parties
- Supports custom gift messages

#### **award_referral_bonus**

- Awards referral bonuses when someone is referred
- Updates referrer's statistics
- Creates transaction records

### 4. **Integration with Purchase System**

The `purchase_cart` instruction now supports loyalty points:

```rust
pub fn purchase_cart(
    ctx: Context<PurchaseCartAccounts>,
    product_ids: Vec<Pubkey>,
    quantities: Vec<u64>,
    total_amount_paid: u64,
    payment_method: PaymentMethod,
    bnpl_term: Option<BnplTerm>,
    loyalty_points_to_use: Option<u64>,  // NEW: Loyalty points for discount
) -> Result<()>
```

#### **Purchase Flow with Loyalty**

1. **Calculate Base Total**: Determine total purchase amount
2. **Apply Loyalty Discount**: If points specified, calculate discount value
3. **Process Payment**: Transfer reduced amount (original - loyalty discount)
4. **Award Points**: After successful payment, award loyalty points
5. **Update Records**: Record both purchase and loyalty transactions

## PDAs (Program Derived Addresses)

### 1. **Loyalty Program PDA**

- Seeds: `[b"loyalty_program", store.key().as_ref()]`
- One per store

### 2. **Loyalty Account PDA**

- Seeds: `[b"loyalty_account", store.key().as_ref(), user.key().as_ref()]`
- One per user per store

### 3. **Loyalty Transaction PDA**

- No seeds (regular account creation)
- One per transaction for audit trail

## Configuration System

### **Default Configuration**

```rust
pub struct LoyaltyConfig {
    pub default_points_per_dollar: u64,    // 100 = 1 point per dollar
    pub default_redemption_rate: u64,      // 100 = 100 points = $1
    pub default_welcome_bonus: u64,        // 500 welcome points
    pub default_referral_bonus: u64,      // 200 referral points
    pub default_min_redemption: u64,      // 100 minimum points to redeem
    pub default_max_redemption_percent: u16, // 5000 = 50% max
    pub max_gift_amount: u64,              // 10,000 max points per gift
}
```

### **Store Customization**

Stores can customize:

- Points earning rate (points per dollar spent)
- Redemption rate (points needed for $1 value)
- Welcome and referral bonuses
- Minimum redemption thresholds
- Maximum redemption percentage
- Point expiry periods
- Tier multiplier enablement

## Events System

The loyalty system emits comprehensive events for off-chain tracking:

### **LoyaltyPointsEarned**

```rust
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
```

### **LoyaltyPointsRedeemed**

```rust
pub struct LoyaltyPointsRedeemed {
    pub user: Pubkey,
    pub store: Pubkey,
    pub points_redeemed: u64,
    pub value_redeemed: u64,
    pub remaining_points: u64,
    pub timestamp: i64,
}
```

### **LoyaltyTierChanged**

```rust
pub struct LoyaltyTierChanged {
    pub user: Pubkey,
    pub store: Pubkey,
    pub old_tier: LoyaltyTier,
    pub new_tier: LoyaltyTier,
    pub total_points: u64,
    pub timestamp: i64,
}
```

### **LoyaltyPointsGifted**

```rust
pub struct LoyaltyPointsGifted {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub store: Pubkey,
    pub points_gifted: u64,
    pub timestamp: i64,
}
```

## Usage Workflows

### 1. **Store Setup**

1. Store owner calls `initialize_loyalty_program()`
2. Configure earning rates, redemption rates, bonuses
3. Program becomes active for customer use

### 2. **Customer Onboarding**

1. User makes first purchase at store
2. System automatically calls `initialize_loyalty_account()`
3. User receives welcome bonus points
4. Referral processing if applicable

### 3. **Earning Points (Purchase)**

1. User completes purchase
2. System calculates points based on amount and tier
3. Calls `earn_loyalty_points()` with Purchase type
4. Updates user's total points and tier if necessary

### 4. **Redeeming Points**

1. User specifies points to use during checkout
2. System validates redemption limits
3. Applies discount to purchase total
4. Calls `redeem_loyalty_points()` after payment
5. Updates available points balance

### 5. **Referral Process**

1. New user specifies referrer during account creation
2. System links accounts and tracks referral
3. When referee makes qualifying purchase, calls `award_referral_bonus()`
4. Referrer receives bonus points

### 6. **Point Gifting**

1. User calls `gift_loyalty_points()` with recipient and amount
2. System validates sender has sufficient points
3. Transfers points between accounts
4. Creates transaction records for both parties

## Security Features

### **Authorization Controls**

- Only store owners can initialize/update loyalty programs
- Users can only access their own loyalty accounts
- Referral codes prevent self-referral

### **Validation Checks**

- Minimum/maximum redemption amounts enforced
- Point balance validation before redemption/gifting
- Program active status checks
- Tier multiplier validation

### **Audit Trail**

- Complete transaction history for all point activities
- Event emissions for off-chain monitoring
- Immutable on-chain records

## Integration with BNPL

The loyalty system seamlessly integrates with BNPL:

1. **BNPL Purchases**: Users can earn points on BNPL downpayments
2. **Loyalty + BNPL**: Users can use loyalty points to reduce BNPL loan amounts
3. **Payment Credits**: Loyalty discounts apply before BNPL calculations

## Performance Optimizations

### **Efficient Storage**

- Optimized account sizes to minimize rent costs
- Compact data structures for frequently accessed data
- Minimal PDA seeds for fast derivation

### **Gas Optimization**

- Batched operations where possible
- Efficient tier calculation algorithms
- Minimal cross-program invocations

## Future Enhancements

### **Planned Features**

1. **Point Expiration**: Automatic point expiry after configured periods
2. **Seasonal Multipliers**: Temporary earning rate boosts
3. **Tiered Benefits**: Exclusive perks for higher tiers
4. **Cross-Store Points**: Point sharing between partner stores
5. **NFT Integration**: Loyalty tier NFTs for exclusive access

### **Advanced Analytics**

1. **Spending Pattern Analysis**: AI-driven insights from purchase data
2. **Personalized Offers**: Targeted promotions based on loyalty behavior
3. **Retention Metrics**: Customer lifetime value tracking

## Compilation Status

✅ **Successfully Compiled**: The loyalty system compiles without errors and is ready for testing and deployment.

## Testing Strategy

### **Unit Tests**

- Individual instruction testing
- Point calculation validation
- Tier progression testing
- Error condition handling

### **Integration Tests**

- End-to-end purchase with loyalty points
- Referral bonus workflows
- Point gifting between users
- Multi-store loyalty scenarios

### **Performance Tests**

- High-volume point transactions
- Concurrent user operations
- Large-scale tier calculations

## Summary

The loyalty system implementation provides a comprehensive, flexible, and scalable solution for customer retention and engagement in the SodapV2.0 ecosystem. Key highlights:

### ✅ **Core Features**

- Multi-tier loyalty system with earning multipliers
- Point earning from purchases with customizable rates
- Point redemption for purchase discounts
- Referral program with bonus rewards
- Point gifting between users
- Store-specific program customization

### ✅ **Technical Excellence**

- Secure PDA-based account structure
- Comprehensive event system for tracking
- Integration with existing payment and BNPL systems
- Optimized storage and gas efficiency
- Complete audit trail for compliance

### ✅ **Business Benefits**

- Increased customer retention through rewards
- Enhanced customer engagement via referrals
- Flexible program configuration for different business models
- Social features promoting viral growth
- Analytics foundation for customer insights

This loyalty implementation positions SodapV2.0 as a comprehensive e-commerce platform with advanced customer retention capabilities, competing with traditional retail giants while leveraging blockchain transparency and security!
