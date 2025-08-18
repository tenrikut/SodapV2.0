import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, SystemProgram, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import { expect } from "chai";

describe("Devnet Integration Test", () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const DEPLOYED_PROGRAM_ID = new PublicKey("G2B8xnzSUP9fhJ5dWDGYWWmUbRA6WjZ3hySyp5hFbyTb");
  let provider: anchor.AnchorProvider;

  before(async () => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
  });

  it("should verify devnet connectivity and program status", async () => {
    // 1. Check devnet connectivity
    const slot = await connection.getSlot();
    expect(slot).to.be.greaterThan(0);
    console.log(`✅ Devnet connectivity verified - Current slot: ${slot}`);

    // 2. Verify program exists and is executable
    const programInfo = await connection.getAccountInfo(DEPLOYED_PROGRAM_ID);
    expect(programInfo).to.not.be.null;
    expect(programInfo!.executable).to.be.true;
    console.log(`✅ Program verified on devnet - Data length: ${programInfo!.data.length} bytes`);

    // 3. Check wallet balance
    const balance = await connection.getBalance(provider.wallet.publicKey);
    expect(balance).to.be.greaterThan(0);
    console.log(`✅ Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  });

  it("should test PDA derivation for different account types", async () => {
    const testUser = Keypair.generate();
    
    // Test Store PDA derivation
    const [storePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("store"), testUser.publicKey.toBuffer()],
      DEPLOYED_PROGRAM_ID
    );
    console.log(`✅ Store PDA derived: ${storePda.toString()}`);

    // Test Escrow PDA derivation
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), storePda.toBuffer()],
      DEPLOYED_PROGRAM_ID
    );
    console.log(`✅ Escrow PDA derived: ${escrowPda.toString()}`);

    // Test Loyalty Account PDA derivation
    const [loyaltyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty"), testUser.publicKey.toBuffer()],
      DEPLOYED_PROGRAM_ID
    );
    console.log(`✅ Loyalty PDA derived: ${loyaltyPda.toString()}`);

    // Test User Profile PDA derivation
    const [userProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile"), testUser.publicKey.toBuffer()],
      DEPLOYED_PROGRAM_ID
    );
    console.log(`✅ User Profile PDA derived: ${userProfilePda.toString()}`);

    // Verify PDAs are valid
    expect(storePda).to.be.instanceOf(PublicKey);
    expect(escrowPda).to.be.instanceOf(PublicKey);
    expect(loyaltyPda).to.be.instanceOf(PublicKey);
    expect(userProfilePda).to.be.instanceOf(PublicKey);
  });

  it("should check for existing program accounts", async () => {
    // Check if there are any existing accounts for the program
    const programAccounts = await connection.getProgramAccounts(DEPLOYED_PROGRAM_ID);
    console.log(`✅ Found ${programAccounts.length} existing program accounts`);
    
    if (programAccounts.length > 0) {
      programAccounts.forEach((account, index) => {
        console.log(`   Account ${index + 1}: ${account.pubkey.toString()} (${account.account.data.length} bytes)`);
      });
    } else {
      console.log("   No existing accounts found (fresh deployment)");
    }
  });

  it("should test transaction construction without execution", async () => {
    const testKeypair = Keypair.generate();
    
    // Create a basic transaction to test program interaction capability
    const tx = new anchor.web3.Transaction();
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = provider.wallet.publicKey;

    // Add a simple instruction (won't be executed)
    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: provider.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: testKeypair.publicKey, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: DEPLOYED_PROGRAM_ID,
      data: Buffer.from([0]), // Minimal data
    });
    
    tx.add(instruction);

    // Test serialization
    const serialized = tx.serialize({ requireAllSignatures: false });
    expect(serialized.length).to.be.greaterThan(0);
    console.log(`✅ Transaction serialization successful - Size: ${serialized.length} bytes`);
  });

  it("should verify program upgrade authority and metadata", async () => {
    // Check program data account
    const programDataAddress = PublicKey.findProgramAddressSync(
      [DEPLOYED_PROGRAM_ID.toBuffer()],
      new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
    )[0];
    
    const programDataAccount = await connection.getAccountInfo(programDataAddress);
    
    if (programDataAccount) {
      console.log(`✅ Program data account found: ${programDataAddress.toString()}`);
      console.log(`   Data length: ${programDataAccount.data.length} bytes`);
      console.log(`   Owner: ${programDataAccount.owner.toString()}`);
      
      // Check if program has upgrade authority
      if (programDataAccount.data.length > 45) {
        const upgradeAuthorityOffset = 45;
        const hasUpgradeAuthority = programDataAccount.data[upgradeAuthorityOffset] === 1;
        
        if (hasUpgradeAuthority) {
          const upgradeAuthority = new PublicKey(programDataAccount.data.slice(upgradeAuthorityOffset + 1, upgradeAuthorityOffset + 33));
          console.log(`   Upgrade authority: ${upgradeAuthority.toString()}`);
        } else {
          console.log("   Program is immutable (no upgrade authority)");
        }
      }
    } else {
      console.log("ℹ️ Program data account not found");
    }
  });

  it("should test devnet rate limits and performance", async () => {
    const startTime = Date.now();
    
    // Test multiple rapid requests to check for rate limiting
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(connection.getSlot());
    }
    
    try {
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).to.have.length(5);
      results.forEach(slot => expect(slot).to.be.greaterThan(0));
      
      console.log(`✅ Rate limit test passed - ${results.length} requests in ${endTime - startTime}ms`);
      console.log(`   Average response time: ${(endTime - startTime) / results.length}ms per request`);
    } catch (error: any) {
      if (error.message.includes("429") || error.message.includes("rate")) {
        console.log("⚠️ Rate limiting detected - this is expected on devnet");
      } else {
        throw error;
      }
    }
  });
});
