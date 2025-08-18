import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sodap } from "../target/types/sodap";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";

describe("Sodap Program Connection Test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Use the deployed program ID on devnet
  const DEPLOYED_PROGRAM_ID = new PublicKey("G2B8xnzSUP9fhJ5dWDGYWWmUbRA6WjZ3hySyp5hFbyTb");

  it("should connect to deployed program on devnet", async () => {
    try {
      // Load the IDL and create program instance
      const idl = require("../target/idl/sodap.json");
      const program = new Program(idl, DEPLOYED_PROGRAM_ID, provider) as Program<Sodap>;

      // Verify program connection
      assert.ok(program, "Program should be initialized");
      assert.equal(program.programId.toString(), DEPLOYED_PROGRAM_ID.toString(), "Program ID should match");

      console.log("✅ Successfully connected to deployed program:", DEPLOYED_PROGRAM_ID.toString());
      console.log("✅ Program methods available:", Object.keys(program.methods).length);
      console.log("✅ Provider cluster:", provider.connection.rpcEndpoint);
    } catch (error) {
      console.error("❌ Failed to connect to program:", error);
      throw error;
    }
  });

  it("should verify program account exists on devnet", async () => {
    try {
      const accountInfo = await provider.connection.getAccountInfo(DEPLOYED_PROGRAM_ID);
      
      assert.ok(accountInfo, "Program account should exist");
      assert.ok(accountInfo.executable, "Program account should be executable");
      
      console.log("✅ Program account verified");
      console.log("   - Executable:", accountInfo.executable);
      console.log("   - Owner:", accountInfo.owner.toString());
      console.log("   - Data length:", accountInfo.data.length, "bytes");
    } catch (error) {
      console.error("❌ Failed to verify program account:", error);
      throw error;
    }
  });

  it("should check provider wallet balance", async () => {
    try {
      const balance = await provider.connection.getBalance(provider.wallet.publicKey);
      const solBalance = balance / anchor.web3.LAMPORTS_PER_SOL;
      
      console.log("✅ Provider wallet balance:", solBalance, "SOL");
      console.log("   - Wallet address:", provider.wallet.publicKey.toString());
      
      // Just log the balance, don't fail if low
      if (solBalance < 0.1) {
        console.log("⚠️  Low SOL balance - may need funding for transactions");
      }
    } catch (error) {
      console.error("❌ Failed to check wallet balance:", error);
      throw error;
    }
  });
});
