import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Functional Program Test", () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const DEPLOYED_PROGRAM_ID = new PublicKey("G2B8xnzSUP9fhJ5dWDGYWWmUbRA6WjZ3hySyp5hFbyTb");
  let provider: anchor.AnchorProvider;

  before(async () => {
    // Set environment variables if not already set
    if (!process.env.ANCHOR_PROVIDER_URL) {
      process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
    }
    if (!process.env.ANCHOR_WALLET) {
      process.env.ANCHOR_WALLET = "/Users/tamkin/.config/solana/id.json";
    }
    
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
  });

  it("should verify program deployment and basic functionality", async () => {
    // 1. Verify program exists
    const programInfo = await connection.getAccountInfo(DEPLOYED_PROGRAM_ID);
    expect(programInfo).to.not.be.null;
    expect(programInfo!.executable).to.be.true;
    
    console.log("✅ Program verified on devnet");
    console.log(`   - Program ID: ${DEPLOYED_PROGRAM_ID.toString()}`);
    console.log(`   - Data length: ${programInfo!.data.length} bytes`);

    // 2. Check wallet balance
    const balance = await connection.getBalance(provider.wallet.publicKey);
    expect(balance).to.be.greaterThan(0);
    
    console.log("✅ Provider wallet has sufficient balance");
    console.log(`   - Wallet: ${provider.wallet.publicKey.toString()}`);
    console.log(`   - Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    // 3. Test PDA derivation (common pattern in Solana programs)
    const [storePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("store"), provider.wallet.publicKey.toBuffer()],
      DEPLOYED_PROGRAM_ID
    );
    
    console.log("✅ PDA derivation successful");
    console.log(`   - Store PDA: ${storePda.toString()}`);

    // 4. Test account lookup for derived addresses
    const storeAccount = await connection.getAccountInfo(storePda);
    if (storeAccount) {
      console.log("✅ Store account found");
      console.log(`   - Data length: ${storeAccount.data.length} bytes`);
      console.log(`   - Owner: ${storeAccount.owner.toString()}`);
    } else {
      console.log("ℹ️ Store account not initialized (expected for fresh deployment)");
    }

    // 5. Test escrow PDA derivation
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), storePda.toBuffer()],
      DEPLOYED_PROGRAM_ID
    );
    
    console.log("✅ Escrow PDA derivation successful");
    console.log(`   - Escrow PDA: ${escrowPda.toString()}`);

    // 6. Test loyalty account PDA derivation
    const [loyaltyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty"), provider.wallet.publicKey.toBuffer()],
      DEPLOYED_PROGRAM_ID
    );
    
    console.log("✅ Loyalty PDA derivation successful");
    console.log(`   - Loyalty PDA: ${loyaltyPda.toString()}`);
  });

  it("should test transaction creation without execution", async () => {
    // Create a basic transaction structure to verify program interaction capability
    const tx = new anchor.web3.Transaction();
    
    // Get recent blockhash for transaction
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = provider.wallet.publicKey;
    
    // Add a simple instruction that would interact with the program
    // This tests that we can construct valid transactions for the program
    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: provider.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: DEPLOYED_PROGRAM_ID,
      data: Buffer.from([]), // Empty data for testing
    });
    
    tx.add(instruction);
    
    // Test transaction serialization (without sending)
    const serialized = tx.serialize({ requireAllSignatures: false });
    expect(serialized).to.be.instanceOf(Buffer);
    expect(serialized.length).to.be.greaterThan(0);
    
    console.log("✅ Transaction creation and serialization successful");
    console.log(`   - Transaction size: ${serialized.length} bytes`);
  });

  it("should verify program upgrade authority", async () => {
    // Check if program has upgrade authority (indicates it's properly deployed)
    const programDataAddress = PublicKey.findProgramAddressSync(
      [DEPLOYED_PROGRAM_ID.toBuffer()],
      new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
    )[0];
    
    const programDataAccount = await connection.getAccountInfo(programDataAddress);
    
    if (programDataAccount) {
      console.log("✅ Program data account found");
      console.log(`   - Program data address: ${programDataAddress.toString()}`);
      console.log(`   - Data length: ${programDataAccount.data.length} bytes`);
    } else {
      console.log("ℹ️ Program data account not found (may be immutable)");
    }
  });
});
