use crate::error::CustomError;
use crate::state::bnpl::{
    BnplCreditScore, BnplLoan, BnplLoanCompleted, BnplLoanCreated, BnplLoanDefaulted, BnplPayment,
    BnplPaymentMade, CreateBnplLoan, InitializeCreditScore, LiquidateBnplLoan, MakeBnplPayment,
};
use crate::types::{BnplLoanStatus, BnplTerm};
use anchor_lang::prelude::*;
use anchor_lang::system_program;

/// Configuration for BNPL system
pub struct BnplConfig {
    pub min_credit_score: u16,
    pub max_loan_amount: u64,
    pub min_downpayment_percent: u16, // in basis points (e.g., 2000 = 20%)
    pub default_interest_rate: u16,   // in basis points (e.g., 500 = 5% annual)
    pub grace_period_days: u8,
    pub late_fee_percent: u16, // in basis points
}

impl Default for BnplConfig {
    fn default() -> Self {
        Self {
            min_credit_score: 600,
            max_loan_amount: 10_000_000_000, // 10 SOL in lamports
            min_downpayment_percent: 2000,   // 20%
            default_interest_rate: 1200,     // 12% annual
            grace_period_days: 7,
            late_fee_percent: 500, // 5%
        }
    }
}

/// Initialize a user's credit score
pub fn initialize_credit_score(ctx: Context<InitializeCreditScore>) -> Result<()> {
    let credit_score = &mut ctx.accounts.credit_score;

    credit_score.user = ctx.accounts.user.key();
    credit_score.score = 650; // Default starting score
    credit_score.total_loans = 0;
    credit_score.successful_payments = 0;
    credit_score.late_payments = 0;
    credit_score.defaults = 0;
    credit_score.last_updated = Clock::get()?.unix_timestamp;

    msg!(
        "Credit score initialized for user: {}",
        ctx.accounts.user.key()
    );
    Ok(())
}

/// Create a new BNPL loan
pub fn create_bnpl_loan(
    ctx: Context<CreateBnplLoan>,
    loan_id: [u8; 16],
    total_amount: u64,
    downpayment: u64,
    term: BnplTerm,
    purchase_receipt: Pubkey,
) -> Result<()> {
    let config = BnplConfig::default();
    let current_time = Clock::get()?.unix_timestamp;

    // Validate loan amount
    require!(
        total_amount <= config.max_loan_amount,
        CustomError::InvalidCart
    );

    // Validate downpayment
    let min_downpayment = (total_amount * config.min_downpayment_percent as u64) / 10000;
    require!(downpayment >= min_downpayment, CustomError::InvalidCart);

    // Check credit score if available
    if let Some(credit_score) = &ctx.accounts.credit_score {
        require!(
            credit_score.is_eligible_for_bnpl(config.min_credit_score),
            CustomError::Unauthorized
        );
    }

    let loan = &mut ctx.accounts.loan;
    let remaining_balance = total_amount - downpayment;

    // Calculate installment amount
    let num_payments = term.to_months() as u64;
    let monthly_interest_rate = config.default_interest_rate as f64 / 10000.0 / 12.0;

    let installment_amount = if monthly_interest_rate == 0.0 {
        remaining_balance / num_payments
    } else {
        let factor = (1.0 + monthly_interest_rate).powf(num_payments as f64);
        let monthly_payment =
            (remaining_balance as f64 * monthly_interest_rate * factor) / (factor - 1.0);
        monthly_payment as u64
    };

    // Initialize loan
    loan.loan_id = loan_id;
    loan.borrower = ctx.accounts.borrower.key();
    loan.store = ctx.accounts.store.key();
    loan.total_amount = total_amount;
    loan.downpayment = downpayment;
    loan.remaining_balance = remaining_balance;
    loan.installment_amount = installment_amount;
    loan.interest_rate = config.default_interest_rate;
    loan.term = term;
    loan.status = BnplLoanStatus::Active;
    loan.created_at = current_time;
    loan.next_payment_due = current_time + (30 * 24 * 60 * 60); // 30 days from now
    loan.payments_made = 0;
    loan.total_payments = term.to_months();
    loan.late_fee = (installment_amount * config.late_fee_percent as u64) / 10000;
    loan.grace_period_days = config.grace_period_days;
    loan.purchase_receipt = purchase_receipt;

    // Transfer downpayment to store
    let transfer_instruction = system_program::Transfer {
        from: ctx.accounts.borrower.to_account_info(),
        to: ctx.accounts.store.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_instruction,
    );

    system_program::transfer(cpi_ctx, downpayment)?;

    // Update credit score if available
    if let Some(credit_score) = &mut ctx.accounts.credit_score.as_mut() {
        credit_score.total_loans += 1;
        credit_score.last_updated = current_time;
    }

    emit!(BnplLoanCreated {
        loan_id,
        borrower: ctx.accounts.borrower.key(),
        store: ctx.accounts.store.key(),
        total_amount,
        term,
        installment_amount,
        created_at: current_time,
    });

    msg!(
        "BNPL loan created: {:?}, Amount: {}, Term: {:?}",
        loan_id,
        total_amount,
        term
    );
    Ok(())
}

/// Make a BNPL payment
pub fn make_bnpl_payment(ctx: Context<MakeBnplPayment>) -> Result<()> {
    let loan = &mut ctx.accounts.loan;
    let current_time = Clock::get()?.unix_timestamp;

    // Check loan status
    require!(
        loan.status == BnplLoanStatus::Active || loan.status == BnplLoanStatus::DefaultedGrace,
        CustomError::InvalidCart
    );

    // Check if loan is completed
    require!(
        loan.payments_made < loan.total_payments,
        CustomError::InvalidCart
    );

    // Calculate payment amount (including late fee if applicable)
    let is_late = current_time > loan.next_payment_due;
    let late_fee = if is_late { loan.late_fee } else { 0 };
    let total_payment_amount = loan.installment_amount + late_fee;

    // Check if payment is overdue beyond grace period
    if loan.is_overdue(current_time) {
        loan.status = BnplLoanStatus::Defaulted;

        emit!(BnplLoanDefaulted {
            loan_id: loan.loan_id,
            borrower: loan.borrower,
            store: loan.store,
            default_date: current_time,
            outstanding_balance: loan.remaining_balance,
        });

        return Err(CustomError::InvalidCart.into());
    }

    // Transfer payment to store owner
    let transfer_instruction = system_program::Transfer {
        from: ctx.accounts.borrower.to_account_info(),
        to: ctx.accounts.store_owner.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_instruction,
    );

    system_program::transfer(cpi_ctx, total_payment_amount)?;

    // Update loan
    loan.remaining_balance = loan
        .remaining_balance
        .saturating_sub(loan.installment_amount);
    loan.update_next_payment_due();

    // Create payment record
    let payment_record = &mut ctx.accounts.payment_record;
    payment_record.loan_id = loan.loan_id;
    payment_record.payment_number = loan.payments_made;
    payment_record.amount_paid = loan.installment_amount;
    payment_record.late_fee_paid = late_fee;
    payment_record.payment_date = current_time;
    payment_record.was_late = is_late;

    // Update credit score
    let credit_score = &mut ctx.accounts.credit_score;
    if is_late {
        credit_score.late_payments += 1;
        loan.status = BnplLoanStatus::DefaultedGrace;
    } else {
        credit_score.successful_payments += 1;
        loan.status = BnplLoanStatus::Active;
    }
    credit_score.calculate_score();
    credit_score.last_updated = current_time;

    // Check if loan is completed
    if loan.payments_made >= loan.total_payments || loan.remaining_balance == 0 {
        loan.status = BnplLoanStatus::Completed;

        emit!(BnplLoanCompleted {
            loan_id: loan.loan_id,
            borrower: loan.borrower,
            store: loan.store,
            completion_date: current_time,
        });
    }

    emit!(BnplPaymentMade {
        loan_id: loan.loan_id,
        borrower: loan.borrower,
        payment_number: payment_record.payment_number,
        amount_paid: total_payment_amount,
        remaining_balance: loan.remaining_balance,
        payment_date: current_time,
        was_late: is_late,
    });

    msg!(
        "BNPL payment made: {:?}, Payment: {}/{}, Amount: {}, Late: {}",
        loan.loan_id,
        loan.payments_made,
        loan.total_payments,
        total_payment_amount,
        is_late
    );

    Ok(())
}

/// Liquidate a defaulted BNPL loan
pub fn liquidate_bnpl_loan(ctx: Context<LiquidateBnplLoan>) -> Result<()> {
    let loan = &mut ctx.accounts.loan;
    let current_time = Clock::get()?.unix_timestamp;

    // Verify loan is defaulted
    require!(
        loan.status == BnplLoanStatus::Defaulted,
        CustomError::InvalidCart
    );

    // Calculate total outstanding amount (remaining balance + accumulated late fees)
    let payments_missed = (loan.total_payments - loan.payments_made) as u64;
    let total_late_fees = loan.late_fee * payments_missed;
    let total_outstanding = loan.remaining_balance + total_late_fees;

    // Transfer liquidation amount from liquidator to store
    let transfer_instruction = system_program::Transfer {
        from: ctx.accounts.liquidator.to_account_info(),
        to: ctx.accounts.store.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_instruction,
    );

    system_program::transfer(cpi_ctx, total_outstanding)?;

    // Update loan status
    loan.status = BnplLoanStatus::Liquidated;
    loan.remaining_balance = 0;

    // Update borrower's credit score
    let credit_score = &mut ctx.accounts.credit_score;
    credit_score.defaults += 1;
    credit_score.calculate_score();
    credit_score.last_updated = current_time;

    msg!(
        "BNPL loan liquidated: {:?}, Amount: {}, Liquidator: {}",
        loan.loan_id,
        total_outstanding,
        ctx.accounts.liquidator.key()
    );

    Ok(())
}

/// Check and update loan statuses (can be called by anyone to maintain system health)
pub fn update_loan_status(ctx: Context<MakeBnplPayment>) -> Result<()> {
    let loan = &mut ctx.accounts.loan;
    let current_time = Clock::get()?.unix_timestamp;

    // Only update active loans
    if loan.status != BnplLoanStatus::Active && loan.status != BnplLoanStatus::DefaultedGrace {
        return Ok(());
    }

    // Check if payment is overdue
    if loan.is_overdue(current_time) {
        loan.status = BnplLoanStatus::Defaulted;

        emit!(BnplLoanDefaulted {
            loan_id: loan.loan_id,
            borrower: loan.borrower,
            store: loan.store,
            default_date: current_time,
            outstanding_balance: loan.remaining_balance,
        });

        msg!("Loan marked as defaulted: {:?}", loan.loan_id);
    } else if current_time > loan.next_payment_due && loan.status == BnplLoanStatus::Active {
        loan.status = BnplLoanStatus::DefaultedGrace;
        msg!("Loan entered grace period: {:?}", loan.loan_id);
    }

    Ok(())
}
