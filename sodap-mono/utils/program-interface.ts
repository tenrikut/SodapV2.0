import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  SendOptions,
} from "@solana/web3.js";
import { AnchorProvider, Program, BN, Idl } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
// Note: You may need to install @solana/spl-token-2022: npm install @solana/spl-token-2022
const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);
import {
  findStorePDA,
  findEscrowPDA,
  findReceiptPDA,
  findProductPDA,
  findLoyaltyMintPDA,
  uuidToBytes,
  PROGRAM_ID,
} from "./pda-helpers";

// Import your program IDL
// Note: You'll need to replace this with your actual IDL import
import idl from "../target/idl/sodap.json";

/**
 * Initialize a Program instance for the Sodap program
 */
export function getSodapProgram(wallet: any, connection: Connection) {
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );

  return new Program(idl as Idl);
}

/**
 * Execute a purchase cart transaction using Solana Pay
 */
export async function purchaseCart(
  connection: Connection,
  wallet: any,
  storePublicKey: string | PublicKey,
  productUuids: string[],
  quantities: number[],
  totalAmountLamports: number,
  reference?: PublicKey,
  gasFee: number = 0
) {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Convert store public key if it's a string
  const storePubkey =
    typeof storePublicKey === "string"
      ? new PublicKey(storePublicKey)
      : storePublicKey;

  // Get PDAs
  const escrowPDA = findEscrowPDA(storePubkey);
  const receiptPDA = findReceiptPDA(storePubkey, wallet.publicKey);

  // Convert product UUIDs to bytes arrays for the contract
  const productUuidBytesArray = productUuids.map((uuid) =>
    Array.from(uuidToBytes(uuid))
  );

  // Get product PDAs for remaining accounts
  const productPDAs = productUuids.map((uuid) =>
    findProductPDA(storePubkey, uuid)
  );

  // Initialize program
  const program = getSodapProgram(wallet, connection);

  // Create transaction instruction
  const ix = await program.methods
    .purchaseCart(
      productUuidBytesArray,
      quantities.map((q) => new BN(q)),
      new BN(totalAmountLamports),
      new BN(gasFee),
      { success: {} } // Transaction status
    )
    .accounts({
      buyer: wallet.publicKey,
      store: storePubkey,
      receipt: receiptPDA,
      storeOwner: wallet.publicKey, // This might need to be the actual store owner
      escrowAccount: escrowPDA,
      systemProgram: SystemProgram.programId,
      payer: wallet.publicKey,
    })
    .remainingAccounts(
      // Add product accounts as remaining accounts
      productPDAs.map((pda) => ({
        pubkey: pda,
        isWritable: true,
        isSigner: false,
      }))
    )
    .instruction();

  // Create transaction and add reference if provided
  const transaction = new Transaction();

  if (reference) {
    transaction.add({
      keys: [{ pubkey: reference, isSigner: false, isWritable: false }],
      programId: SystemProgram.programId,
      data: Buffer.from([]),
    });
  }

  transaction.add(ix);

  // Send transaction
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  try {
    // Sign and send the transaction
    const signedTx = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize());

    // Wait for confirmation
    await connection.confirmTransaction(signature, "confirmed");

    return signature;
  } catch (error) {
    console.error("Error executing purchase transaction:", error);
    throw error;
  }
}

/**
 * Release funds from escrow to the store owner
 */
export async function releaseEscrow(
  connection: Connection,
  wallet: any,
  storePublicKey: string | PublicKey,
  amountLamports: number
) {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Convert store public key if it's a string
  const storePubkey =
    typeof storePublicKey === "string"
      ? new PublicKey(storePublicKey)
      : storePublicKey;

  // Get escrow PDA
  const escrowPDA = findEscrowPDA(storePubkey);

  // Initialize program
  const program = getSodapProgram(wallet, connection);

  try {
    // Create and send transaction
    const tx = await program.methods
      .releaseEscrow(new BN(amountLamports))
      .accounts({
        store: wallet.publicKey,
        storeAccount: storePubkey,
        storeOwner: wallet.publicKey,
        escrowAccount: escrowPDA,
        systemProgram: SystemProgram.programId,
        payer: wallet.publicKey,
      })
      .rpc();

    return tx;
  } catch (error) {
    console.error("Error releasing escrow:", error);
    throw error;
  }
}

/**
 * Initialize a loyalty token mint for a store with Token-2022 features
 * Creates a non-transferable token mint for loyalty points
 */
export async function initializeLoyaltyMint(
  connection: Connection,
  wallet: any,
  storePublicKey: string | PublicKey
) {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Convert store public key if it's a string
  const storePubkey =
    typeof storePublicKey === "string"
      ? new PublicKey(storePublicKey)
      : storePublicKey;

  // Get loyalty mint PDA
  const loyaltyMintPDA = findLoyaltyMintPDA(storePubkey);

  // Initialize program
  const program = getSodapProgram(wallet, connection);

  try {
    // Create transaction for initializing loyalty mint
    const tx = await program.methods
      .initializeLoyaltyMint()
      .accounts({
        store: storePubkey,
        loyaltyMint: loyaltyMintPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        rent: await connection.getMinimumBalanceForRentExemption(0),
      })
      .rpc();

    return {
      signature: tx,
      loyaltyMint: loyaltyMintPDA,
    };
  } catch (error) {
    console.error("Error initializing loyalty mint:", error);
    throw error;
  }
}

/**
 * Mint loyalty points to a user after a purchase
 * Uses 1:1 conversion - 1 SOL spent = 1 loyalty point
 */
export async function mintLoyaltyPoints(
  connection: Connection,
  wallet: any,
  storePublicKey: string | PublicKey,
  userPublicKey: PublicKey,
  amountSol: number
) {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Convert store public key if it's a string
  const storePubkey =
    typeof storePublicKey === "string"
      ? new PublicKey(storePublicKey)
      : storePublicKey;

  // 1:1 conversion (1 SOL = 1 loyalty point)
  const loyaltyPoints = Math.floor(amountSol);
  if (loyaltyPoints <= 0) {
    return null; // No points to mint
  }

  // Get loyalty mint PDA
  const loyaltyMintPDA = findLoyaltyMintPDA(storePubkey);

  // Find the associated token account for the user
  const userTokenAccount = await getAssociatedTokenAddress(
    loyaltyMintPDA,
    userPublicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // Check if the token account exists
  const accountInfo = await connection.getAccountInfo(userTokenAccount);

  // Initialize program
  const program = getSodapProgram(wallet, connection);

  // Create transaction
  const transaction = new Transaction();

  // If token account doesn't exist, add instruction to create it
  if (!accountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        userTokenAccount,
        userPublicKey,
        loyaltyMintPDA,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // Add instruction to mint loyalty points
  const mintIx = await program.methods
    .mintLoyaltyPoints(new BN(loyaltyPoints), userPublicKey)
    .accounts({
      store: storePubkey,
      loyaltyMint: loyaltyMintPDA,
      authority: wallet.publicKey,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      destination: userTokenAccount,
      payer: wallet.publicKey,
    })
    .instruction();

  transaction.add(mintIx);

  // Send transaction
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  try {
    // Sign and send the transaction
    const signedTx = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize());

    // Wait for confirmation
    await connection.confirmTransaction(signature, "confirmed");

    return {
      signature,
      pointsMinted: loyaltyPoints,
      tokenAccount: userTokenAccount,
    };
  } catch (error) {
    console.error("Error minting loyalty points:", error);
    throw error;
  }
}

/**
 * Initialize loyalty program for a store
 */
export async function initializeLoyaltyProgram(
  connection: Connection,
  wallet: any,
  storePublicKey: string | PublicKey,
  pointsPerDollar?: number,
  redemptionRate?: number,
  welcomeBonus?: number,
  referralBonus?: number
) {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Convert store public key if it's a string
  const storePubkey =
    typeof storePublicKey === "string"
      ? new PublicKey(storePublicKey)
      : storePublicKey;

  // Find PDAs
  const loyaltyProgramPDA = PublicKey.findProgramAddressSync(
    [Buffer.from("loyalty_program"), storePubkey.toBuffer()],
    getSodapProgram(wallet, connection).programId
  )[0];

  // Initialize program
  const program = getSodapProgram(wallet, connection);

  try {
    const tx = await program.methods
      .initializeLoyaltyProgram(
        pointsPerDollar ? new BN(pointsPerDollar) : null,
        redemptionRate ? new BN(redemptionRate) : null,
        welcomeBonus ? new BN(welcomeBonus) : null,
        referralBonus ? new BN(referralBonus) : null
      )
      .accounts({
        store: storePubkey,
        loyaltyProgram: loyaltyProgramPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      signature: tx,
      loyaltyProgram: loyaltyProgramPDA,
    };
  } catch (error) {
    console.error("Error initializing loyalty program:", error);
    throw error;
  }
}

/**
 * Initialize loyalty account for a user at a store
 */
export async function initializeLoyaltyAccount(
  connection: Connection,
  wallet: any,
  storePublicKey: string | PublicKey,
  userPublicKey: PublicKey,
  referralCode?: string,
  referredBy?: PublicKey
) {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Convert store public key if it's a string
  const storePubkey =
    typeof storePublicKey === "string"
      ? new PublicKey(storePublicKey)
      : storePublicKey;

  // Find PDAs
  const loyaltyProgramPDA = PublicKey.findProgramAddressSync(
    [Buffer.from("loyalty_program"), storePubkey.toBuffer()],
    getSodapProgram(wallet, connection).programId
  )[0];

  const loyaltyAccountPDA = PublicKey.findProgramAddressSync(
    [
      Buffer.from("loyalty_account"),
      storePubkey.toBuffer(),
      userPublicKey.toBuffer(),
    ],
    getSodapProgram(wallet, connection).programId
  )[0];

  // Initialize program
  const program = getSodapProgram(wallet, connection);

  try {
    const tx = await program.methods
      .initializeLoyaltyAccount(
        referralCode
          ? Array.from(new TextEncoder().encode(referralCode.slice(0, 8)))
          : null,
        referredBy || null
      )
      .accounts({
        user: userPublicKey,
        store: storePubkey,
        loyaltyProgram: loyaltyProgramPDA,
        loyaltyAccount: loyaltyAccountPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      signature: tx,
      loyaltyProgram: loyaltyProgramPDA,
      loyaltyAccount: loyaltyAccountPDA,
    };
  } catch (error) {
    console.error("Error initializing loyalty account:", error);
    throw error;
  }
}

/**
 * Award loyalty points using the program's earn_loyalty_points instruction
 * Automatically initializes loyalty program and account if they don't exist
 */
export async function earnLoyaltyPoints(
  connection: Connection,
  wallet: any,
  storePublicKey: string | PublicKey,
  userPublicKey: PublicKey,
  purchaseAmountSol: number,
  pointType: "Purchase" | "Referral" | "Bonus" | "Welcome" = "Purchase"
) {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Convert store public key if it's a string
  const storePubkey =
    typeof storePublicKey === "string"
      ? new PublicKey(storePublicKey)
      : storePublicKey;

  // Convert purchase amount to lamports
  const purchaseAmountLamports = Math.floor(purchaseAmountSol * 1e9);

  // Find PDAs
  const loyaltyProgramPDA = PublicKey.findProgramAddressSync(
    [Buffer.from("loyalty_program"), storePubkey.toBuffer()],
    getSodapProgram(wallet, connection).programId
  )[0];

  const loyaltyAccountPDA = PublicKey.findProgramAddressSync(
    [
      Buffer.from("loyalty_account"),
      storePubkey.toBuffer(),
      userPublicKey.toBuffer(),
    ],
    getSodapProgram(wallet, connection).programId
  )[0];

  // Create a new keypair for transaction record (not a PDA)
  const transactionRecord = Keypair.generate();

  // Initialize program
  const program = getSodapProgram(wallet, connection);

  try {
    // Check if loyalty program exists, if not initialize it
    let loyaltyProgramExists = true;
    try {
      await program.account.loyaltyProgram.fetch(loyaltyProgramPDA);
    } catch (error) {
      loyaltyProgramExists = false;
    }

    if (!loyaltyProgramExists) {
      console.log("Initializing loyalty program for store...");
      await initializeLoyaltyProgram(connection, wallet, storePubkey);
    }

    // Check if loyalty account exists, if not initialize it
    let loyaltyAccountExists = true;
    try {
      await program.account.loyaltyAccount.fetch(loyaltyAccountPDA);
    } catch (error) {
      loyaltyAccountExists = false;
    }

    if (!loyaltyAccountExists) {
      console.log("Initializing loyalty account for user...");
      await initializeLoyaltyAccount(
        connection,
        wallet,
        storePubkey,
        userPublicKey
      );
    }

    // Now earn the points
    const tx = await program.methods
      .earnLoyaltyPoints(new BN(purchaseAmountLamports), {
        [pointType.toLowerCase()]: {},
      })
      .accounts({
        loyaltyAccount: loyaltyAccountPDA,
        store: storePubkey,
        loyaltyProgram: loyaltyProgramPDA,
        transactionRecord: transactionRecord.publicKey,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([transactionRecord])
      .rpc();

    return {
      signature: tx,
      loyaltyProgram: loyaltyProgramPDA,
      loyaltyAccount: loyaltyAccountPDA,
    };
  } catch (error) {
    console.error("Error earning loyalty points:", error);
    throw error;
  }
}

/**
 * Deduct loyalty points for refunds using the program's deduct_loyalty_points instruction
 * Automatically initializes loyalty program and account if they don't exist
 */
export async function deductLoyaltyPoints(
  connection: Connection,
  wallet: any,
  storePublicKey: string | PublicKey,
  userPublicKey: PublicKey,
  refundAmountSol: number,
  pointType: "Purchase" | "Referral" | "Bonus" | "Welcome" = "Purchase"
) {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Convert store public key if it's a string
  const storePubkey =
    typeof storePublicKey === "string"
      ? new PublicKey(storePublicKey)
      : storePublicKey;

  // Convert refund amount to lamports
  const refundAmountLamports = Math.floor(refundAmountSol * 1e9);

  // Find PDAs
  const loyaltyProgramPDA = PublicKey.findProgramAddressSync(
    [Buffer.from("loyalty_program"), storePubkey.toBuffer()],
    getSodapProgram(wallet, connection).programId
  )[0];

  const loyaltyAccountPDA = PublicKey.findProgramAddressSync(
    [
      Buffer.from("loyalty_account"),
      storePubkey.toBuffer(),
      userPublicKey.toBuffer(),
    ],
    getSodapProgram(wallet, connection).programId
  )[0];

  // Create a new keypair for transaction record (not a PDA)
  const transactionRecord = Keypair.generate();

  // Initialize program
  const program = getSodapProgram(wallet, connection);

  try {
    // Check if loyalty program exists, if not initialize it
    let loyaltyProgramExists = true;
    try {
      await program.account.loyaltyProgram.fetch(loyaltyProgramPDA);
    } catch (error) {
      loyaltyProgramExists = false;
    }

    if (!loyaltyProgramExists) {
      console.log("Initializing loyalty program for store...");
      await initializeLoyaltyProgram(connection, wallet, storePubkey);
    }

    // Check if loyalty account exists, if not initialize it
    let loyaltyAccountExists = true;
    try {
      await program.account.loyaltyAccount.fetch(loyaltyAccountPDA);
    } catch (error) {
      loyaltyAccountExists = false;
    }

    if (!loyaltyAccountExists) {
      console.log("Initializing loyalty account for user...");
      await initializeLoyaltyAccount(
        connection,
        wallet,
        storePubkey,
        userPublicKey
      );
    }

    // Now deduct the points
    const tx = await program.methods
      .deductLoyaltyPoints(new BN(refundAmountLamports), {
        [pointType.toLowerCase()]: {},
      })
      .accounts({
        loyaltyAccount: loyaltyAccountPDA,
        store: storePubkey,
        loyaltyProgram: loyaltyProgramPDA,
        transactionRecord: transactionRecord.publicKey,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([transactionRecord])
      .rpc();

    return {
      signature: tx,
      loyaltyProgram: loyaltyProgramPDA,
      loyaltyAccount: loyaltyAccountPDA,
    };
  } catch (error) {
    console.error("Error deducting loyalty points:", error);
    throw error;
  }
}

/**
 * Get a user's loyalty point balance from their loyalty account
 */
export async function getLoyaltyPointBalance(
  connection: Connection,
  userPublicKey: PublicKey,
  storePublicKey: string | PublicKey
) {
  // Convert store public key if it's a string
  const storePubkey =
    typeof storePublicKey === "string"
      ? new PublicKey(storePublicKey)
      : storePublicKey;

  // Find the loyalty account PDA
  const loyaltyAccountPDA = PublicKey.findProgramAddressSync(
    [
      Buffer.from("loyalty_account"),
      storePubkey.toBuffer(),
      userPublicKey.toBuffer(),
    ],
    getSodapProgram({ publicKey: userPublicKey }, connection).programId
  )[0];

  try {
    // Get the program instance
    const program = getSodapProgram({ publicKey: userPublicKey }, connection);

    // Fetch the loyalty account
    const loyaltyAccount = await program.account.loyaltyAccount.fetch(
      loyaltyAccountPDA
    );

    return loyaltyAccount.availablePoints.toNumber();
  } catch (error) {
    console.warn("Loyalty account not found or error fetching:", error);
    return 0; // Account doesn't exist or error occurred
  }
}
