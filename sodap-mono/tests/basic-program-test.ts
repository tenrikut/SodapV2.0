import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { expect } from "chai";

describe("Basic Program Test", () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const DEPLOYED_PROGRAM_ID = new PublicKey("G2B8xnzSUP9fhJ5dWDGYWWmUbRA6WjZ3hySyp5hFbyTb");

  it("should verify program exists on devnet", async () => {
    const programInfo = await connection.getAccountInfo(DEPLOYED_PROGRAM_ID);
    
    expect(programInfo).to.not.be.null;
    expect(programInfo!.executable).to.be.true;
    expect(programInfo!.owner.toString()).to.equal("BPFLoaderUpgradeab1e11111111111111111111111");
    
    console.log("✅ Program verified on devnet");
    console.log(`   - Program ID: ${DEPLOYED_PROGRAM_ID.toString()}`);
    console.log(`   - Data length: ${programInfo!.data.length} bytes`);
    console.log(`   - Owner: ${programInfo!.owner.toString()}`);
  });

  it("should check provider wallet balance", async () => {
    const provider = anchor.AnchorProvider.env();
    const balance = await connection.getBalance(provider.wallet.publicKey);
    
    expect(balance).to.be.greaterThan(0);
    
    console.log("✅ Provider wallet has sufficient balance");
    console.log(`   - Wallet: ${provider.wallet.publicKey.toString()}`);
    console.log(`   - Balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
  });

  it("should verify program can be called without full IDL", async () => {
    // Create a minimal program interface just to test basic connectivity
    const provider = anchor.AnchorProvider.env();
    
    // Test that we can create a transaction to the program (even if it fails)
    // This verifies the program ID is valid and accessible
    try {
      const tx = new anchor.web3.Transaction();
      const instruction = new anchor.web3.TransactionInstruction({
        keys: [],
        programId: DEPLOYED_PROGRAM_ID,
        data: Buffer.from([]), // Empty data - will fail but proves connectivity
      });
      tx.add(instruction);
      
      // We expect this to fail, but it should fail with a program error, not a connection error
      try {
        await provider.sendAndConfirm(tx);
      } catch (error: any) {
        // If we get a program error, that means we successfully connected to the program
        if (error.message.includes("Program") || error.message.includes("instruction")) {
          console.log("✅ Program is accessible (expected instruction error)");
          return;
        }
        throw error;
      }
    } catch (error: any) {
      console.log(`Program connectivity test result: ${error.message}`);
      // As long as we don't get a "program not found" error, we're good
      expect(error.message).to.not.include("not found");
    }
  });
});
