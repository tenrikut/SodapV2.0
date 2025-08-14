#![allow(unexpected_cfgs)] // Suppress warnings about unexpected configuration flags
#![allow(deprecated)] // Suppress warnings about deprecated features
use anchor_lang::prelude::*;

// Declare the program ID used by Anchor
declare_id!("9NgjNh7QMk6227b1LWimxke2oCJnbE45JR927TSgra9a");

// Module declarations without re-exports
mod error;
mod instructions;
mod state;
pub mod types;
mod utils;

// Re-export instruction modules
use instructions::*;

// Re-export state modules
use state::*;

// Re-export error module
use error::*;

// Re-export types module
use types::*;

// Define ProductAttribute type since it's not found in types.rs
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProductAttribute {
    pub name: String,
    pub value: String,
}

// Custom error types for validation
#[error_code]
pub enum CustomError {
    #[msg("Invalid store id")]
    InvalidStoreId,
    #[msg("Too many admins. Maximum allowed is 10")]
    TooManyAdmins,
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance,
    #[msg("Too many products in purchase. Maximum allowed is 10")]
    TooManyProducts,
    #[msg("Invalid purchase: number of products does not match quantities")]
    InvalidPurchase,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid cart")]
    InvalidCart,
    #[msg("Arithmetic error")]
    ArithmeticError,
}

// Use Store and Escrow structs from state module
use state::store::Store;
use state::Escrow;

// Define Purchase struct for storing purchase records
#[derive(Debug)]
#[account]
pub struct Purchase {
    pub product_ids: Vec<Pubkey>,
    pub quantities: Vec<u64>,
    pub total_paid: u64,
    pub gas_fee: u64,
    pub store: Pubkey,
    pub buyer: Pubkey,
    pub timestamp: i64,
}

impl Purchase {
    pub const MAX_PRODUCTS: usize = 10;

    pub fn validate_products(&self) -> anchor_lang::Result<()> {
        anchor_lang::require!(self.product_ids.len() <= Self::MAX_PRODUCTS, CustomError::TooManyProducts);
        anchor_lang::require!(self.product_ids.len() == self.quantities.len(), CustomError::InvalidPurchase);
        Ok(())
    }
}

// Declare a struct here to avoid using one from a module
#[derive(Accounts)]
pub struct RegisterStoreAccounts<'info> {
    #[account(
        init_if_needed, 
        payer = payer, 
        space = 8 + 32 + 32 + 100 + 200 + 100 + 1 + 8 + 500, 
        seeds = [b"store", authority.key().as_ref()], 
        bump
    )]
    pub store: Account<'info, Store>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateStoreAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateOrUpdateUserProfileAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ScanAndPurchaseAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterProductAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProductAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeactivateProductAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Add a new struct for emitting purchase events
#[event]
pub struct PurchaseCompleted {
    pub store: Pubkey,
    pub buyer: Pubkey,
    pub total_amount: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct PurchaseCartAccounts<'info> {
    // Store information
    #[account(mut)]
    pub store: Account<'info, Store>,

    // Receipt/Purchase record
    #[account(
        init,
        payer = buyer,
        space = 8 + // discriminator
            (4 + Purchase::MAX_PRODUCTS * 32) + // product_ids Vec<Pubkey>
            (4 + Purchase::MAX_PRODUCTS * 8) + // quantities Vec<u64>
            8 + // total_paid
            8 + // gas_fee
            32 + // store
            32 + // buyer
            8 // timestamp
    )]
    pub receipt: Account<'info, Purchase>,

    // The buyer who is paying for the cart
    #[account(mut)]
    pub buyer: Signer<'info>,

    // The store owner who will receive payment
    #[account(mut)]
    /// CHECK: This is not dangerous because we're only using it for payment
    pub store_owner: AccountInfo<'info>,

    // The escrow account that holds funds during the purchase
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + 32 + 8,
        seeds = [b"escrow", store.key().as_ref()],
        bump
    )]
    pub escrow_account: Account<'info, Escrow>,

    // Required programs
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddPlatformAdminAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemovePlatformAdminAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddStoreAdminAccounts<'info> {
    #[account(mut)]
    pub store: Account<'info, Store>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveStoreAdminAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct ReleaseEscrowAccounts<'info> {
    #[account(mut)]
    pub store: Account<'info, Store>,
    #[account(mut)]
    /// CHECK: This is safe because we're only using it for payment
    pub store_owner: AccountInfo<'info>,
    #[account(mut)]
    pub escrow_account: Account<'info, Escrow>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundEscrowAccounts<'info> {
    // Store information
    #[account(mut)]
    pub store: Account<'info, Store>,

    // Store owner authorizing the refund
    #[account(
        constraint = store_owner.key() == store.owner @ CustomError::Unauthorized
    )]
    pub store_owner: Signer<'info>,

    // The buyer who receives the refund
    #[account(mut)]
    /// CHECK: This is not dangerous because we're only sending funds to this account
    pub buyer: AccountInfo<'info>,

    // The escrow account that holds funds
    #[account(
        mut,
        seeds = [b"escrow", store.key().as_ref()],
        bump,
        constraint = escrow_account.store == store.key() @ CustomError::Unauthorized
    )]
    pub escrow_account: Account<'info, Escrow>,

    pub system_program: Program<'info, System>,
}

#[program]
pub mod sodap {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Program initialized by: {:?}", ctx.accounts.payer.key());
        Ok(())
    }

    pub fn create_user_wallet(ctx: Context<CreateUserWallet>) -> Result<()> {
        instructions::user_wallet::create_user_wallet(ctx)
    }

    // Store-related instruction
    pub fn register_store(
        ctx: Context<RegisterStoreAccounts>,
        name: String,
        description: String,
        logo_uri: String,
    ) -> Result<()> {
        // Get a mutable reference to the store account
        let store = &mut ctx.accounts.store;
        let authority = &ctx.accounts.authority;

        // Set the store account fields
        store.owner = authority.key();
        store.name = name;
        store.description = description;
        store.logo_uri = logo_uri;
        store.is_active = true;
        store.revenue = 0;

        // Initialize admin roles with the owner as the first admin with owner role
        store.admin_roles = vec![state::store::AdminRole {
            admin_pubkey: authority.key(),
            role_type: types::AdminRoleType::Owner {},
        }];

        msg!("Store registered successfully");
        msg!("Owner: {:?}", store.owner);
        Ok(())
    }

    pub fn update_store(
        ctx: Context<UpdateStoreAccounts>,
        store_id: Pubkey,
        name: Option<String>,
        description: Option<String>,
        logo_uri: Option<String>,
    ) -> Result<()> {
        // Simplified implementation
        msg!("Updating store: {:?}", store_id);
        if let Some(name) = name {
            msg!("New store name: {}", name);
        }
        if let Some(description) = description {
            msg!("New store description: {}", description);
        }
        if let Some(logo_uri) = logo_uri {
            msg!("New store logo URI: {}", logo_uri);
    }
        Ok(())
    }

    // User profile operations
    pub fn create_or_update_user_profile(
        ctx: Context<CreateOrUpdateUserProfileAccounts>,
        user_id: Option<Pubkey>,
        name: Option<String>,
        email: Option<String>,
        phone: Option<String>,
    ) -> Result<()> {
        // Simplified implementation
        msg!("Creating or updating user profile");
        if let Some(user_id) = user_id {
            msg!("User ID: {:?}", user_id);
        }
        if let Some(name) = name {
            msg!("Name: {}", name);
        }
        if let Some(email) = email {
            msg!("Email: {}", email);
        }
        if let Some(phone) = phone {
            msg!("Phone: {}", phone);
        }
        Ok(())
    }

    pub fn scan_and_purchase(
        ctx: Context<ScanAndPurchaseAccounts>,
        product_ids: Vec<Pubkey>,
        quantities: Vec<u64>,
        user_id: Pubkey,
    ) -> Result<()> {
        // Simplified implementation
        msg!("Scanning and purchasing products");
        msg!("User ID: {:?}", user_id);
        msg!("Product IDs: {:?}", product_ids);
        msg!("Quantities: {:?}", quantities);
        Ok(())
    }

    // Product operations
    pub fn register_product(
        ctx: Context<RegisterProductAccounts>,
        product_id: Pubkey,
        store_id: Pubkey,
        name: String,
        description: String,
        image_uri: String,
        price: u64,
        inventory: Option<u64>,
        attributes: Vec<ProductAttribute>,
    ) -> Result<()> {
        // Simplified implementation
        msg!("Registering product: {:?}", product_id);
        msg!("Store ID: {:?}", store_id);
        msg!("Name: {}", name);
        msg!("Description: {}", description);
        msg!("Image URI: {}", image_uri);
        msg!("Price: {}", price);
        if let Some(inventory) = inventory {
            msg!("Inventory: {}", inventory);
        }
        msg!("Attributes: {:?}", attributes);
        Ok(())
    }

    pub fn update_product(
        ctx: Context<UpdateProductAccounts>,
        product_id: Pubkey,
        name: Option<String>,
        description: Option<String>,
        image_uri: Option<String>,
        price: Option<u64>,
        inventory: Option<u64>,
        attributes: Option<Vec<ProductAttribute>>,
    ) -> Result<()> {
        // Simplified implementation
        msg!("Updating product: {:?}", product_id);
        if let Some(name) = name {
            msg!("New name: {}", name);
        }
        if let Some(description) = description {
            msg!("New description: {}", description);
        }
        if let Some(image_uri) = image_uri {
            msg!("New image URI: {}", image_uri);
        }
        if let Some(price) = price {
            msg!("New price: {}", price);
        }
        if let Some(inventory) = inventory {
            msg!("New inventory: {}", inventory);
        }
        if let Some(attributes) = attributes {
            msg!("New attributes: {:?}", attributes);
        }
        Ok(())
    }

    pub fn deactivate_product(
        ctx: Context<DeactivateProductAccounts>,
        product_id: Pubkey,
    ) -> Result<()> {
        // Simplified implementation
        msg!("Deactivating product: {:?}", product_id);
        Ok(())
    }

    pub fn purchase_cart(
        ctx: Context<PurchaseCartAccounts>,
        product_ids: Vec<Pubkey>,
        quantities: Vec<u64>,
        total_amount_paid: u64,
        payment_method: PaymentMethod,
        bnpl_term: Option<BnplTerm>,
        loyalty_points_to_use: Option<u64>,
    ) -> Result<()> {
        // Validate cart data
        require!(
            product_ids.len() == quantities.len() && !product_ids.is_empty(),
            CustomError::InvalidCart
        );

        // Calculate total price (in real implementation, you would validate product prices)
        // For simplicity, we're assuming total_amount_paid is correct
        let base_total_price = total_amount_paid;
        
        // Handle loyalty points redemption if specified
        let loyalty_discount = if let Some(points) = loyalty_points_to_use {
            // Note: In a full implementation, we would validate loyalty points here
            // For now, assume 100 points = 1 dollar (1_000_000_000 lamports)
            (points * 1_000_000_000) / 100
        } else {
            0
        };
        
        let total_price = base_total_price.saturating_sub(loyalty_discount);
        let actual_payment_needed = total_price;

        // Handle payment based on method
        match payment_method {
            PaymentMethod::FullPayment => {
                // Traditional full payment - transfer to escrow
                let cpi_context = CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.escrow_account.to_account_info(),
                    },
                );
                anchor_lang::system_program::transfer(cpi_context, actual_payment_needed)?;
            },
            PaymentMethod::BNPL => {
                // BNPL payment - only transfer downpayment to escrow
                // The BNPL loan will be created separately
                require!(bnpl_term.is_some(), CustomError::InvalidCart);
                
                // Calculate minimum downpayment (20% of total)
                let min_downpayment = (actual_payment_needed * 2000) / 10000; // 20%
                require!(
                    total_amount_paid >= min_downpayment,
                    CustomError::InvalidCart
                );
                
                // Transfer downpayment to escrow
                let cpi_context = CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.escrow_account.to_account_info(),
                    },
                );
                anchor_lang::system_program::transfer(cpi_context, total_amount_paid)?;
                
                msg!("BNPL purchase initiated - Downpayment: {}, Total: {}, Term: {:?}", 
                     total_amount_paid, total_price, bnpl_term.unwrap());
            }
        }

        // Get current escrow balance before updating
        let escrow_balance = ctx.accounts.escrow_account.balance;

        // Update escrow account
        ctx.accounts.escrow_account.store = ctx.accounts.store.key();
        let actual_deposit = match payment_method {
            PaymentMethod::FullPayment => actual_payment_needed,
            PaymentMethod::BNPL => total_amount_paid, // Only downpayment deposited
        };
        ctx.accounts.escrow_account.balance = escrow_balance
            .checked_add(actual_deposit)
            .ok_or(CustomError::ArithmeticError)?;

        // Update receipt
        let receipt = &mut ctx.accounts.receipt;
        receipt.product_ids = product_ids.clone();
        receipt.quantities = quantities.clone();
        receipt.total_paid = match payment_method {
            PaymentMethod::FullPayment => base_total_price, // Record full original price
            PaymentMethod::BNPL => base_total_price, // Record full price, even if only downpayment made
        };
        receipt.gas_fee = 0; // For simplicity
        receipt.store = ctx.accounts.store.key();
        receipt.buyer = ctx.accounts.buyer.key();
        receipt.timestamp = Clock::get()?.unix_timestamp;


        // Emit purchase event
        emit!(PurchaseCompleted {
            store: ctx.accounts.store.key(),
            buyer: ctx.accounts.buyer.key(),
            total_amount: total_price,
            timestamp: receipt.timestamp,
        });

        // Log purchase
        msg!("Purchase completed - Original total: {}, After loyalty discount: {}, Actual paid: {}", 
             base_total_price, loyalty_discount, actual_payment_needed);
        msg!(
            "Funds held in escrow: {}",
            ctx.accounts.escrow_account.balance
        );
        if let Some(points) = loyalty_points_to_use {
            msg!("Loyalty points used: {}, Discount value: {} lamports", points, loyalty_discount);
        }

        Ok(())
    }

    // Admin operations
    pub fn add_platform_admin(
        ctx: Context<AddPlatformAdminAccounts>,
        admin_pubkey: Pubkey,
        admin_name: String,
        root_password: String,
    ) -> Result<()> {
        // Simplified implementation
        msg!("Adding platform admin: {:?}", admin_pubkey);
        msg!("Admin name: {}", admin_name);
        msg!("Root password provided (hidden)");
        Ok(())
    }

    pub fn remove_platform_admin(
        ctx: Context<RemovePlatformAdminAccounts>,
        admin_pubkey: Pubkey,
        root_password: String,
    ) -> Result<()> {
        // Simplified implementation
        msg!("Removing platform admin: {:?}", admin_pubkey);
        msg!("Root password provided (hidden)");
        Ok(())
    }

    pub fn add_store_admin(
        ctx: Context<AddStoreAdminAccounts>,
        store_id: Pubkey,
        admin_pubkey: Pubkey,
        role: types::AdminRoleType,
    ) -> Result<()> {
        // Get a mutable reference to the store account
        let store = &mut ctx.accounts.store;
        let authority = &ctx.accounts.authority;

        // Check that the authority is the store owner
        require!(
            authority.key() == store.owner,
            error::CustomError::Unauthorized
        );
        require!(authority.is_signer, error::CustomError::Unauthorized);

        // Check if admin already exists
        if store
            .admin_roles
            .iter()
            .any(|r| r.admin_pubkey == admin_pubkey)
        {
            return Err(error::CustomError::AdminAlreadyExists.into());
        }

        // Add the admin to the store's admin_roles vector
        store.admin_roles.push(state::store::AdminRole {
            admin_pubkey,
            role_type: role,
        });

        msg!("Admin added successfully: {:?}", admin_pubkey);
        Ok(())
    }

    pub fn remove_store_admin(
        ctx: Context<RemoveStoreAdminAccounts>,
        store_id: Pubkey,
        admin_pubkey: Pubkey,
    ) -> Result<()> {
        // Simplified implementation
        msg!("Removing store admin: {:?}", admin_pubkey);
        msg!("Store ID: {:?}", store_id);
        Ok(())
    }


    // Function to release funds from escrow to store owner
    pub fn release_escrow(ctx: Context<ReleaseEscrowAccounts>, amount: u64) -> Result<()> {
        // Check if escrow has enough balance
        require!(
            ctx.accounts.escrow_account.balance >= amount,
            CustomError::InsufficientEscrowBalance
        );

        // Transfer from escrow to store owner
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.escrow_account.to_account_info(),
            to: ctx.accounts.store_owner.to_account_info(),
        };

        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        anchor_lang::system_program::transfer(cpi_ctx, amount)?;

        // Update escrow balance
        ctx.accounts.escrow_account.balance = ctx.accounts.escrow_account.balance.checked_sub(amount).unwrap();

        // Log the release
        msg!("Released {} lamports from escrow to store owner", amount);
        msg!(
            "Remaining escrow balance: {}",
            ctx.accounts.escrow_account.balance
        );

        Ok(())
    }

    // Function to refund funds from escrow to buyer
    pub fn refund_from_escrow(ctx: Context<RefundEscrowAccounts>, amount: u64) -> Result<()> {
        // Check if escrow has enough balance
        require!(
            ctx.accounts.escrow_account.balance >= amount,
            CustomError::InsufficientEscrowBalance
        );

        // Transfer from escrow to buyer (refund)
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.escrow_account.to_account_info(),
            to: ctx.accounts.buyer.to_account_info(),
        };

        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        anchor_lang::system_program::transfer(cpi_ctx, amount)?;

        // Update escrow balance
        ctx.accounts.escrow_account.balance = ctx.accounts.escrow_account.balance.checked_sub(amount).unwrap();

        // Log the refund
        msg!("Refunded {} lamports from escrow to buyer", amount);
        msg!(
            "Remaining escrow balance: {}",
            ctx.accounts.escrow_account.balance
        );

        Ok(())
    }

    // BNPL-related instructions
    pub fn initialize_credit_score(ctx: Context<InitializeCreditScore>) -> Result<()> {
        instructions::bnpl::initialize_credit_score(ctx)
    }

    pub fn create_bnpl_loan(
        ctx: Context<CreateBnplLoan>,
        loan_id: [u8; 16],
        total_amount: u64,
        downpayment: u64,
        term: BnplTerm,
        purchase_receipt: Pubkey,
    ) -> Result<()> {
        instructions::bnpl::create_bnpl_loan(ctx, loan_id, total_amount, downpayment, term, purchase_receipt)
    }

    pub fn make_bnpl_payment(ctx: Context<MakeBnplPayment>) -> Result<()> {
        instructions::bnpl::make_bnpl_payment(ctx)
    }

    pub fn liquidate_bnpl_loan(ctx: Context<LiquidateBnplLoan>) -> Result<()> {
        instructions::bnpl::liquidate_bnpl_loan(ctx)
    }

    pub fn update_loan_status(ctx: Context<MakeBnplPayment>) -> Result<()> {
        instructions::bnpl::update_loan_status(ctx)
    }

    // Loyalty-related instructions
    pub fn initialize_loyalty_program(
        ctx: Context<InitializeLoyaltyProgram>,
        points_per_dollar: Option<u64>,
        redemption_rate: Option<u64>,
        welcome_bonus: Option<u64>,
        referral_bonus: Option<u64>,
    ) -> Result<()> {
        instructions::loyalty::initialize_loyalty_program(
            ctx,
            points_per_dollar,
            redemption_rate,
            welcome_bonus,
            referral_bonus,
        )
    }

    pub fn initialize_loyalty_account(
        ctx: Context<InitializeLoyaltyAccount>,
        referral_code: Option<[u8; 8]>,
        referred_by: Option<Pubkey>,
    ) -> Result<()> {
        instructions::loyalty::initialize_loyalty_account(ctx, referral_code, referred_by)
    }

    pub fn earn_loyalty_points(
        ctx: Context<EarnLoyaltyPoints>,
        purchase_amount: u64,
        point_type: LoyaltyPointType,
    ) -> Result<()> {
        instructions::loyalty::earn_loyalty_points(ctx, purchase_amount, point_type)
    }

    pub fn redeem_loyalty_points(
        ctx: Context<RedeemLoyaltyPoints>,
        points_to_redeem: u64,
        total_purchase_amount: u64,
    ) -> Result<u64> {
        instructions::loyalty::redeem_loyalty_points(ctx, points_to_redeem, total_purchase_amount)
    }

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
        instructions::loyalty::update_loyalty_program(
            ctx,
            points_per_dollar,
            redemption_rate,
            welcome_bonus,
            referral_bonus,
            min_redemption,
            max_redemption_percent,
            is_active,
        )
    }

    pub fn gift_loyalty_points(
        ctx: Context<GiftLoyaltyPoints>,
        points_to_gift: u64,
        message: String,
    ) -> Result<()> {
        instructions::loyalty::gift_loyalty_points(ctx, points_to_gift, message)
    }

    pub fn award_referral_bonus(
        ctx: Context<EarnLoyaltyPoints>,
        referred_user: Pubkey,
    ) -> Result<()> {
        instructions::loyalty::award_referral_bonus(ctx, referred_user)
    }

    pub fn deduct_loyalty_points(
        ctx: Context<EarnLoyaltyPoints>,
        refund_amount: u64,
        point_type: LoyaltyPointType,
    ) -> Result<()> {
        instructions::loyalty::deduct_loyalty_points(ctx, refund_amount, point_type)
    }
}


#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}


