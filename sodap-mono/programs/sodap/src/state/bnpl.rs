use super::store::Store;
use crate::error::CustomError;
use crate::types::{BnplLoanStatus, BnplTerm};
use anchor_lang::prelude::*;

#[account]
pub struct BnplLoan {
    pub loan_id: [u8; 16],        // Unique loan identifier
    pub borrower: Pubkey,         // Borrower's wallet
    pub store: Pubkey,            // Store where purchase was made
    pub total_amount: u64,        // Total loan amount in lamports
    pub downpayment: u64,         // Initial downpayment made
    pub remaining_balance: u64,   // Remaining balance to be paid
    pub installment_amount: u64,  // Amount per installment
    pub interest_rate: u16,       // Interest rate in basis points (e.g., 500 = 5%)
    pub term: BnplTerm,           // Loan term (3, 6, or 12 months)
    pub status: BnplLoanStatus,   // Current loan status
    pub created_at: i64,          // Loan creation timestamp
    pub next_payment_due: i64,    // Next payment due date
    pub payments_made: u8,        // Number of payments made so far
    pub total_payments: u8,       // Total number of payments required
    pub late_fee: u64,            // Late fee amount
    pub grace_period_days: u8,    // Grace period in days
    pub purchase_receipt: Pubkey, // Reference to purchase receipt
}

impl BnplLoan {
    pub const LEN: usize =
        8 + 16 + 32 + 32 + 8 + 8 + 8 + 8 + 2 + 1 + 1 + 8 + 8 + 1 + 1 + 8 + 1 + 32;

    /// Calculate monthly installment amount
    pub fn calculate_installment(&self) -> Result<u64> {
        let principal = self.total_amount - self.downpayment;
        let monthly_interest_rate = self.interest_rate as f64 / 10000.0 / 12.0;
        let num_payments = self.term.to_months() as f64;

        if monthly_interest_rate == 0.0 {
            // No interest case
            return Ok(principal / num_payments as u64);
        }

        // Calculate using compound interest formula
        let factor = (1.0 + monthly_interest_rate).powf(num_payments);
        let monthly_payment = (principal as f64 * monthly_interest_rate * factor) / (factor - 1.0);

        Ok(monthly_payment as u64)
    }

    /// Check if payment is overdue
    pub fn is_overdue(&self, current_time: i64) -> bool {
        current_time > self.next_payment_due + (self.grace_period_days as i64 * 24 * 60 * 60)
    }

    /// Update next payment due date
    pub fn update_next_payment_due(&mut self) {
        const SECONDS_PER_MONTH: i64 = 30 * 24 * 60 * 60;
        self.next_payment_due += SECONDS_PER_MONTH;
        self.payments_made += 1;
    }
}

#[account]
pub struct BnplPayment {
    pub loan_id: [u8; 16],  // Associated loan ID
    pub payment_number: u8, // Payment sequence number
    pub amount_paid: u64,   // Amount paid in this installment
    pub late_fee_paid: u64, // Late fee paid (if any)
    pub payment_date: i64,  // When payment was made
    pub was_late: bool,     // Whether this payment was late
}

impl BnplPayment {
    pub const LEN: usize = 8 + 16 + 1 + 8 + 8 + 8 + 1;
}

#[account]
pub struct BnplCreditScore {
    pub user: Pubkey,             // User's wallet
    pub score: u16,               // Credit score (300-850)
    pub total_loans: u16,         // Total loans taken
    pub successful_payments: u16, // Number of on-time payments
    pub late_payments: u16,       // Number of late payments
    pub defaults: u16,            // Number of defaults
    pub last_updated: i64,        // Last update timestamp
}

impl BnplCreditScore {
    pub const LEN: usize = 8 + 32 + 2 + 2 + 2 + 2 + 2 + 8;

    /// Calculate credit score based on payment history
    pub fn calculate_score(&mut self) {
        let base_score = 500u16;
        let mut score = base_score;

        // Positive factors
        let payment_ratio = if self.total_loans > 0 {
            (self.successful_payments as f32 / (self.total_loans * 12) as f32 * 100.0) as u16
        } else {
            100
        };
        score += payment_ratio.min(200);

        // Negative factors
        score = score.saturating_sub(self.late_payments * 10);
        score = score.saturating_sub(self.defaults * 100);

        // Clamp between 300-850
        self.score = score.max(300).min(850);
    }

    /// Check if user is eligible for BNPL
    pub fn is_eligible_for_bnpl(&self, min_score: u16) -> bool {
        self.score >= min_score
    }
}

#[derive(Accounts)]
#[instruction(loan_id: [u8; 16])]
pub struct CreateBnplLoan<'info> {
    #[account(
        init,
        payer = borrower,
        space = BnplLoan::LEN,
        seeds = [b"bnpl_loan", borrower.key().as_ref(), loan_id.as_ref()],
        bump
    )]
    pub loan: Account<'info, BnplLoan>,

    #[account(mut)]
    pub store: Account<'info, Store>,

    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(
        mut,
        seeds = [b"credit_score", borrower.key().as_ref()],
        bump
    )]
    pub credit_score: Option<Account<'info, BnplCreditScore>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeBnplPayment<'info> {
    #[account(
        mut,
        seeds = [b"bnpl_loan", borrower.key().as_ref(), loan.loan_id.as_ref()],
        bump,
        has_one = borrower,
        has_one = store
    )]
    pub loan: Account<'info, BnplLoan>,

    #[account(
        init,
        payer = borrower,
        space = BnplPayment::LEN,
        seeds = [b"bnpl_payment", loan.key().as_ref(), &[loan.payments_made + 1]],
        bump
    )]
    pub payment_record: Account<'info, BnplPayment>,

    #[account(mut)]
    pub store: Account<'info, Store>,

    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(
        mut,
        seeds = [b"credit_score", borrower.key().as_ref()],
        bump
    )]
    pub credit_score: Account<'info, BnplCreditScore>,

    /// CHECK: Store owner receives the payment
    #[account(
        mut,
        constraint = store_owner.key() == store.owner @ CustomError::Unauthorized
    )]
    pub store_owner: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeCreditScore<'info> {
    #[account(
        init,
        payer = user,
        space = BnplCreditScore::LEN,
        seeds = [b"credit_score", user.key().as_ref()],
        bump
    )]
    pub credit_score: Account<'info, BnplCreditScore>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LiquidateBnplLoan<'info> {
    #[account(
        mut,
        seeds = [b"bnpl_loan", loan.borrower.as_ref(), loan.loan_id.as_ref()],
        bump,
        constraint = loan.status == BnplLoanStatus::Defaulted @ CustomError::InvalidCart
    )]
    pub loan: Account<'info, BnplLoan>,

    #[account(mut)]
    pub store: Account<'info, Store>,

    /// CHECK: Liquidator can be anyone who wants to pay off the debt
    #[account(mut)]
    pub liquidator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"credit_score", loan.borrower.as_ref()],
        bump
    )]
    pub credit_score: Account<'info, BnplCreditScore>,

    pub system_program: Program<'info, System>,
}

/// Event emitted when a BNPL loan is created
#[event]
pub struct BnplLoanCreated {
    pub loan_id: [u8; 16],
    pub borrower: Pubkey,
    pub store: Pubkey,
    pub total_amount: u64,
    pub term: BnplTerm,
    pub installment_amount: u64,
    pub created_at: i64,
}

/// Event emitted when a BNPL payment is made
#[event]
pub struct BnplPaymentMade {
    pub loan_id: [u8; 16],
    pub borrower: Pubkey,
    pub payment_number: u8,
    pub amount_paid: u64,
    pub remaining_balance: u64,
    pub payment_date: i64,
    pub was_late: bool,
}

/// Event emitted when a BNPL loan is completed
#[event]
pub struct BnplLoanCompleted {
    pub loan_id: [u8; 16],
    pub borrower: Pubkey,
    pub store: Pubkey,
    pub completion_date: i64,
}

/// Event emitted when a BNPL loan defaults
#[event]
pub struct BnplLoanDefaulted {
    pub loan_id: [u8; 16],
    pub borrower: Pubkey,
    pub store: Pubkey,
    pub default_date: i64,
    pub outstanding_balance: u64,
}
