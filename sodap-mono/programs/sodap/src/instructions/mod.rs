// Submodules for instruction handlers
pub mod admin;
pub mod bnpl;
pub mod loyalty;
pub mod product;
pub mod store;
pub mod user;
pub mod user_wallet;

// Re-export for easier use in lib.rs
pub use admin::*;
pub use bnpl::*;
pub use loyalty::*;
pub use product::*;
pub use store::*;
pub use user::*;
pub use user_wallet::*;
