import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sodap } from "../target/types/sodap";
import { PublicKey } from "@solana/web3.js";

/**
 * Test configuration for devnet testing
 * Uses existing deployed program instead of redeploying
 */
export const TEST_CONFIG = {
  // Use the existing deployed program ID on devnet
  PROGRAM_ID: new PublicKey("G2B8xnzSUP9fhJ5dWDGYWWmUbRA6WjZ3hySyp5hFbyTb"),
  
  // Network configuration
  CLUSTER: "devnet",
  
  // Test delays to avoid rate limiting
  TRANSACTION_DELAY: 2000, // 2 seconds between transactions
  CONFIRMATION_TIMEOUT: 60000, // 60 seconds timeout
  
  // Test account funding amounts
  TEST_ACCOUNT_FUNDING: 0.1, // SOL per test account
  MIN_BALANCE_THRESHOLD: 0.05, // Minimum SOL balance before refunding
};

/**
 * Initialize program with existing deployment
 */
export function initializeProgram(): Program<Sodap> {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  // Connect to existing deployed program
  const idl = require("../target/idl/sodap.json");
  const program = new Program(
    idl,
    TEST_CONFIG.PROGRAM_ID,
    provider
  ) as Program<Sodap>;
  
  return program;
}

/**
 * Add delay between transactions to avoid rate limiting
 */
export async function addTransactionDelay(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.TRANSACTION_DELAY));
}
