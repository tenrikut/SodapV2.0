# Complete Payment Systems List for SodapV2.0

## Overview

This document provides a comprehensive list of all payment-related information, structures, methods, and functionalities implemented in the SodapV2.0 anchor program.

## 1. Payment Methods

### 1.1 **PaymentMethod Enum**

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum PaymentMethod {
    FullPayment, // Traditional full payment upfront
    BNPL,        // Buy Now, Pay Later
}
```

### 1.2 **Payment Method Features**

- **FullPayment**: Complete payment at time of purchase
- **BNPL**: Partial payment (downpayment) with installment plan

## 2. BNPL (Buy Now, Pay Later) System

### 2.1 **BNPL Terms**

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum BnplTerm {
    ThreeMonths,  // 3 monthly payments
    SixMonths,    // 6 monthly payments
    TwelveMonths, // 12 monthly payments
}

impl BnplTerm {
    pub fn to_months(&self) -> u8;      // Convert to number of months
    pub fn to_seconds(&self) -> i64;    // Convert to seconds for calculations
}
```

### 2.2 **BNPL Loan Status**

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum BnplLoanStatus {
    Active,         // Loan is active with pending payments
    Completed,      // All payments made successfully
    DefaultedGrace, // Missed payment but in grace period
    Defaulted,      // Loan defaulted, needs liquidation
    Liquidated,     // Loan has been liquidated
}
```

### 2.3 **BNPL Data Structures**

#### **BnplLoan Account**

```rust
#[account]
pub struct BnplLoan {
    pub loan_id: [u8; 16],              // Unique loan identifier
    pub borrower: Pubkey,               // Borrower's wallet
    pub store: Pubkey,                  // Store where purchase was made
    pub total_amount: u64,              // Total loan amount in lamports
    pub downpayment: u64,               // Initial downpayment made
    pub remaining_balance: u64,         // Remaining balance to be paid
    pub interest_rate: u16,             // Interest rate in basis points
    pub term: BnplTerm,                 // Loan term (3, 6, or 12 months)
    pub total_payments: u8,             // Total number of payments required
    pub payments_made: u8,              // Number of payments made so far
    pub installment_amount: u64,        // Amount per installment
    pub next_payment_due: i64,          // Next payment due date
    pub last_payment_date: i64,         // When last payment was made
    pub created_at: i64,                // Loan creation timestamp
    pub status: BnplLoanStatus,         // Current loan status
    pub late_fee: u64,                  // Flat late fee per missed payment
    pub bump: u8,                       // PDA bump
}
```

#### **BnplCreditScore Account**

```rust
#[account]
pub struct BnplCreditScore {
    pub user: Pubkey,                   // User's wallet
    pub score: u16,                     // Credit score (300-850)
    pub total_loans: u16,               // Total loans taken
    pub successful_payments: u16,       // Number of on-time payments
    pub late_payments: u16,             // Number of late payments
    pub defaults: u16,                  // Number of defaults
    pub last_updated: i64,              // Last update timestamp
}
```

### 2.4 **BNPL Instructions**

- `initialize_credit_score()` - Initialize user credit score
- `create_bnpl_loan()` - Create new BNPL loan
- `make_bnpl_payment()` - Process monthly payments
- `liquidate_bnpl_loan()` - Handle defaulted loans
- `update_loan_status()` - Update loan status based on payment dates

### 2.5 **BNPL PDAs**

- **Loan PDA**: `[b"bnpl_loan", borrower.key(), loan_id]`
- **Credit Score PDA**: `[b"credit_score", user.key()]`
- **Payment Record PDA**: `[b"bnpl_payment", loan.key(), payment_number]`

## 3. Loyalty Points System

### 3.1 **Loyalty Point Types**

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum LoyaltyPointType {
    Purchase, // Points earned from purchases
    Referral, // Points earned from referring others
    Bonus,    // Bonus points from promotions
    Welcome,  // Welcome bonus points
}
```

### 3.2 **Loyalty Tiers**

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum LoyaltyTier {
    Bronze,   // Basic tier (1.0x multiplier, 0+ points)
    Silver,   // Mid tier (1.2x multiplier, 1000+ points)
    Gold,     // High tier (1.5x multiplier, 5000+ points)
    Platinum, // Premium tier (2.0x multiplier, 15000+ points)
}

impl LoyaltyTier {
    pub fn required_points(&self) -> u64;    // Points required for tier
    pub fn multiplier(&self) -> f32;         // Earning multiplier
}
```

### 3.3 **Loyalty Transaction Types**

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum LoyaltyTransactionType {
    Earned,   // Points earned
    Redeemed, // Points redeemed
    Expired,  // Points expired
    Gifted,   // Points gifted to another user
    Received, // Points received from another user
}
```

### 3.4 **Loyalty Data Structures**

#### **LoyaltyAccount**

```rust
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
```

#### **LoyaltyProgram**

```rust
#[account]
pub struct LoyaltyProgram {
    pub store: Pubkey,                 // Store this program belongs to
    pub is_active: bool,               // Whether the program is active
    pub points_per_dollar: u64,        // Points earned per dollar spent
    pub redemption_rate: u64,          // Points needed for 1 dollar value
    pub welcome_bonus: u64,            // Welcome bonus points
    pub referral_bonus: u64,           // Referral bonus points
    pub min_redemption: u64,           // Minimum points for redemption
    pub max_redemption_percent: u16,   // Max % of purchase payable with points
    pub point_expiry_days: u32,        // Days until points expire (0 = never)
    pub tier_multiplier_enabled: bool, // Whether tier multipliers are enabled
    pub created_at: i64,               // Program creation timestamp
    pub updated_at: i64,               // Last update timestamp
}
```

### 3.5 **Loyalty Instructions**

- `initialize_loyalty_program()` - Create store loyalty program
- `initialize_loyalty_account()` - Create user loyalty account
- `earn_loyalty_points()` - Award points to users
- `redeem_loyalty_points()` - Redeem points for discounts
- `update_loyalty_program()` - Update program settings
- `gift_loyalty_points()` - Transfer points between users
- `award_referral_bonus()` - Award referral bonuses

### 3.6 **Loyalty PDAs**

- **Loyalty Program PDA**: `[b"loyalty_program", store.key()]`
- **Loyalty Account PDA**: `[b"loyalty_account", store.key(), user.key()]`
- **Transaction Record**: Regular account (no seeds)

## 4. Core Payment Processing

### 4.1 **Main Purchase Function**

```rust
pub fn purchase_cart(
    ctx: Context<PurchaseCartAccounts>,
    product_ids: Vec<Pubkey>,              // Products being purchased
    quantities: Vec<u64>,                  // Quantities for each product
    total_amount_paid: u64,                // Base total amount
    payment_method: PaymentMethod,         // Full payment or BNPL
    bnpl_term: Option<BnplTerm>,          // BNPL term if applicable
    loyalty_points_to_use: Option<u64>,   // Loyalty points for discount
) -> Result<()>
```

### 4.2 **Payment Flow**

1. **Calculate Base Total**: Sum of all product prices × quantities
2. **Apply Loyalty Discount**: Subtract value of loyalty points used
3. **Process Payment Method**:
   - **FullPayment**: Transfer full amount (minus loyalty discount) to escrow
   - **BNPL**: Transfer only downpayment (20% minimum) to escrow
4. **Update Records**: Create purchase receipt and transaction logs

### 4.3 **Payment Accounts Structure**

```rust
#[derive(Accounts)]
pub struct PurchaseCartAccounts<'info> {
    #[account(mut)]
    pub store: Account<'info, Store>,               // Store information

    #[account(init, payer = buyer, space = ...)]
    pub receipt: Account<'info, Purchase>,          // Purchase receipt

    #[account(mut)]
    pub buyer: Signer<'info>,                       // Buyer paying

    #[account(mut)]
    pub store_owner: AccountInfo<'info>,            // Store owner receiving payment

    #[account(init_if_needed, seeds = [b"escrow", store.key()], bump)]
    pub escrow_account: Account<'info, Escrow>,     // Escrow holding funds

    pub system_program: Program<'info, System>,
}
```

## 5. Escrow System

### 5.1 **Escrow Account Structure**

```rust
#[account]
pub struct Escrow {
    pub store: Pubkey,    // Store this escrow belongs to
    pub balance: u64,     // Current balance in lamports
}
```

### 5.2 **Escrow Operations**

#### **Release Escrow**

```rust
pub fn release_escrow(ctx: Context<ReleaseEscrowAccounts>, amount: u64) -> Result<()>
```

- Transfers funds from escrow to store owner
- Requires store owner authorization
- Updates escrow balance

#### **Refund Escrow**

```rust
pub fn refund_from_escrow(ctx: Context<RefundEscrowAccounts>, amount: u64) -> Result<()>
```

- Transfers funds from escrow back to buyer
- Requires store owner authorization
- Used for returns and refunds

### 5.3 **Escrow PDAs**

- **Escrow PDA**: `[b"escrow", store.key()]`
- One escrow account per store

## 6. Purchase Records

### 6.1 **Purchase Structure**

```rust
#[account]
pub struct Purchase {
    pub product_ids: Vec<Pubkey>,    // Products purchased
    pub quantities: Vec<u64>,        // Quantities of each product
    pub total_paid: u64,            // Total amount paid
    pub gas_fee: u64,               // Transaction gas fee
    pub store: Pubkey,              // Store where purchase was made
    pub buyer: Pubkey,              // Buyer who made purchase
    pub timestamp: i64,             // Purchase timestamp
}
```

### 6.2 **Purchase Validation**

- Maximum 10 products per cart
- Product IDs must match quantities array
- All products must be in stock
- Payment amount must cover total cost

## 7. Transaction Status & Error Handling

### 7.1 **Transaction Status**

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum TransactionStatus {
    Pending,    // Transaction initiated but not completed
    Completed,  // Transaction successfully completed
    Failed,     // Transaction failed
}
```

### 7.2 **Payment-Related Errors**

```rust
#[error_code]
pub enum CustomError {
    // Payment Errors
    #[msg("Insufficient payment")]
    InsufficientPayment,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid cart")]
    InvalidCart,
    #[msg("Arithmetic error")]
    ArithmeticError,

    // BNPL Errors
    #[msg("Invalid BNPL configuration")]
    InvalidBnplConfig,
    #[msg("BNPL loan not found")]
    BnplLoanNotFound,
    #[msg("BNPL payment not due yet")]
    BnplPaymentNotDue,
    #[msg("BNPL payment overdue")]
    BnplPaymentOverdue,
    #[msg("Invalid BNPL payment amount")]
    InvalidBnplPayment,
    #[msg("BNPL loan already completed")]
    BnplLoanCompleted,
    #[msg("BNPL loan defaulted")]
    BnplLoanDefaulted,
    #[msg("Insufficient credit score for BNPL")]
    InsufficientCreditScore,
    #[msg("BNPL downpayment required")]
    BnplDownpaymentRequired,

    // Loyalty Errors
    #[msg("Insufficient loyalty points")]
    InsufficientLoyaltyPoints,
    #[msg("Loyalty program is inactive")]
    LoyaltyProgramInactive,
    #[msg("Invalid loyalty points")]
    InvalidLoyaltyPoints,

    // Escrow Errors
    #[msg("Escrow account not found")]
    EscrowNotFound,
}
```

## 8. Events System

### 8.1 **Purchase Events**

```rust
#[event]
pub struct PurchaseCompleted {
    pub store: Pubkey,        // Store where purchase was made
    pub buyer: Pubkey,        // Buyer who made purchase
    pub total_amount: u64,    // Total amount paid
    pub timestamp: i64,       // Purchase timestamp
}

#[event]
pub struct CartPurchased {
    pub store_id: Pubkey,         // Store identifier
    pub buyer_id: Pubkey,         // Buyer identifier
    pub product_uuids: Vec<[u8; 16]>, // Product identifiers
    pub quantities: Vec<u64>,     // Product quantities
    pub total_paid: u64,          // Total amount paid
    pub gas_fee: u64,            // Gas fee
    pub timestamp: i64,          // Transaction timestamp
}
```

### 8.2 **BNPL Events**

```rust
#[event]
pub struct BnplLoanCreated {
    pub loan_id: [u8; 16],       // Loan identifier
    pub borrower: Pubkey,        // Borrower
    pub store: Pubkey,           // Store
    pub total_amount: u64,       // Total loan amount
    pub term: BnplTerm,          // Loan term
    pub installment_amount: u64, // Monthly payment amount
    pub created_at: i64,         // Creation timestamp
}

#[event]
pub struct BnplPaymentMade {
    pub loan_id: [u8; 16],       // Loan identifier
    pub borrower: Pubkey,        // Borrower
    pub payment_number: u8,      // Payment sequence number
    pub amount_paid: u64,        // Amount paid
    pub remaining_balance: u64,  // Remaining balance
    pub payment_date: i64,       // Payment date
    pub was_late: bool,          // Whether payment was late
}
```

### 8.3 **Loyalty Events**

```rust
#[event]
pub struct LoyaltyPointsEarned {
    pub user: Pubkey,            // User who earned points
    pub store: Pubkey,           // Store where points were earned
    pub points_earned: u64,      // Points earned
    pub point_type: LoyaltyPointType, // Type of points
    pub new_total: u64,          // New total points
    pub new_tier: LoyaltyTier,   // New loyalty tier
    pub purchase_amount: u64,    // Related purchase amount
    pub timestamp: i64,          // Timestamp
}

#[event]
pub struct LoyaltyPointsRedeemed {
    pub user: Pubkey,            // User who redeemed points
    pub store: Pubkey,           // Store where points were redeemed
    pub points_redeemed: u64,    // Points redeemed
    pub value_redeemed: u64,     // Value of points in lamports
    pub remaining_points: u64,   // Remaining points
    pub timestamp: i64,          // Timestamp
}
```

## 9. Frontend Integration

### 9.1 **Payment Hook (TypeScript)**

```typescript
export const usePayment = () => {
  const { program, walletAddress, connection } = useAnchor();

  const processPayment = async (
    cartItems: CartItem[],
    storeId: string
  ): Promise<PaymentResult> => {
    // Payment processing logic
  };
};
```

### 9.2 **Payment Components**

- `PaymentDetailsCard` - Display payment breakdown
- `PaymentSuccessDialog` - Show payment confirmation
- `Cart` - Shopping cart with payment options

## 10. Configuration & Defaults

### 10.1 **BNPL Configuration**

```rust
pub struct BnplConfig {
    pub max_loan_amount: u64,           // Maximum loan amount
    pub min_downpayment_percent: u16,   // Minimum downpayment (basis points)
    pub default_interest_rate: u16,     // Default interest rate (basis points)
    pub grace_period_days: u8,          // Grace period for late payments
    pub late_fee_percent: u16,          // Late fee percentage
}

// Defaults:
// - Max loan: 100,000 lamports
// - Min downpayment: 20%
// - Interest rate: 12% annual
// - Grace period: 7 days
// - Late fee: 5%
```

### 10.2 **Loyalty Configuration**

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

## 11. Security Features

### 11.1 **Authorization Controls**

- Store owners control escrow releases and refunds
- Users can only access their own loyalty accounts
- BNPL credit scores are user-specific
- Payment authorizations require proper signatures

### 11.2 **Validation Checks**

- Payment amount validation against cart total
- Stock availability checks before purchase
- BNPL eligibility and credit score validation
- Loyalty point balance validation
- Arithmetic overflow protection

### 11.3 **PDA Security**

- Deterministic address generation
- Proper seed validation
- Bump verification
- Account ownership verification

## 12. Gas Optimization

### 12.1 **Efficient Operations**

- Batched product updates during purchase
- Minimal cross-program invocations
- Optimized account sizes
- Efficient PDA derivation

### 12.2 **Storage Optimization**

- Compact data structures
- Minimal required space allocation
- Efficient vector storage for product lists
- Optimized string storage for metadata

## Summary

The SodapV2.0 payment system provides:

### ✅ **Payment Methods**

- Traditional full payments
- BNPL with flexible terms (3, 6, 12 months)
- Loyalty point redemption integration

### ✅ **Advanced Features**

- Multi-tier loyalty system with earning multipliers
- Credit scoring for BNPL eligibility
- Point gifting and referral programs
- Comprehensive transaction tracking

### ✅ **Security & Compliance**

- Escrow-based payment protection
- Comprehensive error handling
- Event-based audit trails
- Authorization controls at all levels

### ✅ **Business Benefits**

- Customer retention through loyalty rewards
- Increased sales through BNPL options
- Viral growth through referral programs
- Complete payment analytics and reporting

This comprehensive payment system positions SodapV2.0 as a complete e-commerce platform with advanced payment options that rival traditional retail platforms while leveraging blockchain security and transparency.
