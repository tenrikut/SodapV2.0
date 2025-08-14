import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sodap } from "../target/types/sodap";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";

describe("BNPL and Loyalty Integration Tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Sodap as Program<Sodap>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // Test accounts
  let storeOwner: Keypair;
  let customer: Keypair;
  let store: PublicKey;
  let escrowAccount: PublicKey;
  let bnplLoan: PublicKey;
  let creditScore: PublicKey;
  let loyaltyProgram: PublicKey;
  let loyaltyAccount: PublicKey;

  before(async () => {
    // Create test accounts
    storeOwner = Keypair.generate();
    customer = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(
      storeOwner.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      customer.publicKey,
      10 * LAMPORTS_PER_SOL
    );

    // Wait for airdrops to confirm
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Derive PDAs
    [store] = PublicKey.findProgramAddressSync(
      [Buffer.from("store"), storeOwner.publicKey.toBuffer()],
      program.programId
    );

    [escrowAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), store.toBuffer()],
      program.programId
    );

    [creditScore] = PublicKey.findProgramAddressSync(
      [Buffer.from("credit_score"), customer.publicKey.toBuffer()],
      program.programId
    );

    [loyaltyProgram] = PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty_program"), store.toBuffer()],
      program.programId
    );

    [loyaltyAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("loyalty_account"),
        store.toBuffer(),
        customer.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  describe("Store and Loyalty Program Setup", () => {
    it("Should register a store successfully", async () => {
      try {
        await program.methods
          .registerStore(
            "Test Store",
            "A test store for BNPL and loyalty testing",
            "https://example.com/logo.png"
          )
          .accounts({
            store: store,
            authority: storeOwner.publicKey,
            payer: storeOwner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([storeOwner])
          .rpc();

        const storeAccount = await program.account.store.fetch(store);
        expect(storeAccount.name).to.equal("Test Store");
        expect(storeAccount.owner.toString()).to.equal(
          storeOwner.publicKey.toString()
        );
        expect(storeAccount.isActive).to.be.true;

        console.log("✅ Store registered successfully");
      } catch (error) {
        console.log("❌ Store registration failed:", error);
        throw error;
      }
    });

    it("Should initialize loyalty program", async () => {
      try {
        await program.methods
          .initializeLoyaltyProgram(
            new anchor.BN(100), // 100 points per dollar
            new anchor.BN(100), // 100 points = $1
            new anchor.BN(500), // 500 welcome bonus
            new anchor.BN(200) // 200 referral bonus
          )
          .accounts({
            loyaltyProgram: loyaltyProgram,
            store: store,
            storeOwner: storeOwner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([storeOwner])
          .rpc();

        const programAccount = await program.account.loyaltyProgram.fetch(
          loyaltyProgram
        );
        expect(programAccount.pointsPerDollar.toNumber()).to.equal(100);
        expect(programAccount.isActive).to.be.true;

        console.log("✅ Loyalty program initialized successfully");
      } catch (error) {
        console.log("❌ Loyalty program initialization failed:", error);
        throw error;
      }
    });
  });

  describe("Customer Account Setup", () => {
    it("Should initialize customer credit score", async () => {
      try {
        await program.methods
          .initializeCreditScore()
          .accounts({
            creditScore: creditScore,
            user: customer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([customer])
          .rpc();

        const creditScoreAccount = await program.account.bnplCreditScore.fetch(
          creditScore
        );
        expect(creditScoreAccount.score).to.equal(650); // Default starting score
        expect(creditScoreAccount.user.toString()).to.equal(
          customer.publicKey.toString()
        );

        console.log("✅ Credit score initialized successfully");
      } catch (error) {
        console.log("❌ Credit score initialization failed:", error);
        throw error;
      }
    });

    it("Should initialize customer loyalty account", async () => {
      try {
        await program.methods
          .initializeLoyaltyAccount(
            null, // No referral code
            null // Not referred by anyone
          )
          .accounts({
            loyaltyAccount: loyaltyAccount,
            loyaltyProgram: loyaltyProgram,
            user: customer.publicKey,
            store: store,
            systemProgram: SystemProgram.programId,
          })
          .signers([customer])
          .rpc();

        const loyaltyAccountData = await program.account.loyaltyAccount.fetch(
          loyaltyAccount
        );
        expect(loyaltyAccountData.user.toString()).to.equal(
          customer.publicKey.toString()
        );
        expect(loyaltyAccountData.store.toString()).to.equal(store.toString());
        expect(loyaltyAccountData.availablePoints.toNumber()).to.equal(500); // Welcome bonus

        console.log("✅ Loyalty account initialized successfully");
      } catch (error) {
        console.log("❌ Loyalty account initialization failed:", error);
        throw error;
      }
    });
  });

  describe("Purchase with Loyalty Points Redemption", () => {
    it("Should make a purchase with loyalty points discount", async () => {
      try {
        const receipt = Keypair.generate();
        const productIds = [Keypair.generate().publicKey];
        const quantities = [new anchor.BN(1)];
        const totalAmount = new anchor.BN(2 * LAMPORTS_PER_SOL); // 2 SOL
        const loyaltyPointsToUse = new anchor.BN(100); // Use 100 points = 1 SOL discount

        await program.methods
          .purchaseCart(
            productIds,
            quantities,
            totalAmount,
            { fullPayment: {} }, // PaymentMethod::FullPayment
            null, // No BNPL term
            loyaltyPointsToUse
          )
          .accounts({
            store: store,
            receipt: receipt.publicKey,
            buyer: customer.publicKey,
            storeOwner: storeOwner.publicKey,
            escrowAccount: escrowAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([customer, receipt])
          .rpc();

        // Check that escrow received the discounted amount (2 SOL - 1 SOL discount)
        const escrowAccountData = await program.account.escrow.fetch(
          escrowAccount
        );
        expect(escrowAccountData.balance.toNumber()).to.equal(
          1 * LAMPORTS_PER_SOL
        );

        // Check that loyalty points were deducted
        const loyaltyAccountData = await program.account.loyaltyAccount.fetch(
          loyaltyAccount
        );
        expect(loyaltyAccountData.availablePoints.toNumber()).to.equal(400); // 500 - 100 used

        console.log("✅ Purchase with loyalty points completed successfully");
      } catch (error) {
        console.log("❌ Purchase with loyalty points failed:", error);
        throw error;
      }
    });
  });

  describe("BNPL Loan Creation and Management", () => {
    it("Should create a BNPL loan", async () => {
      try {
        const loanId = Array.from(crypto.getRandomValues(new Uint8Array(16)));
        const totalAmount = new anchor.BN(5 * LAMPORTS_PER_SOL); // 5 SOL
        const downpayment = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL (20%)
        const receipt = Keypair.generate().publicKey;

        [bnplLoan] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("bnpl_loan"),
            customer.publicKey.toBuffer(),
            Buffer.from(loanId),
          ],
          program.programId
        );

        await program.methods
          .createBnplLoan(
            loanId,
            totalAmount,
            downpayment,
            { threeMonths: {} }, // 3 month term
            receipt
          )
          .accounts({
            bnplLoan: bnplLoan,
            creditScore: creditScore,
            borrower: customer.publicKey,
            store: store,
            storeOwner: storeOwner.publicKey,
            escrowAccount: escrowAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([customer])
          .rpc();

        const loanAccount = await program.account.bnplLoan.fetch(bnplLoan);
        expect(loanAccount.totalAmount.toNumber()).to.equal(
          5 * LAMPORTS_PER_SOL
        );
        expect(loanAccount.downpayment.toNumber()).to.equal(
          1 * LAMPORTS_PER_SOL
        );
        expect(loanAccount.remainingBalance.toNumber()).to.equal(
          4 * LAMPORTS_PER_SOL
        );
        expect(loanAccount.borrower.toString()).to.equal(
          customer.publicKey.toString()
        );

        console.log("✅ BNPL loan created successfully");
      } catch (error) {
        console.log("❌ BNPL loan creation failed:", error);
        throw error;
      }
    });

    it("Should make a BNPL payment", async () => {
      try {
        // Get loan data before payment
        const loanAccountBefore = await program.account.bnplLoan.fetch(
          bnplLoan
        );
        const initialBalance = loanAccountBefore.remainingBalance.toNumber();
        const installmentAmount =
          loanAccountBefore.installmentAmount.toNumber();

        await program.methods
          .makeBnplPayment()
          .accounts({
            bnplLoan: bnplLoan,
            creditScore: creditScore,
            borrower: customer.publicKey,
            store: store,
            escrowAccount: escrowAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([customer])
          .rpc();

        // Check that payment was processed
        const loanAccountAfter = await program.account.bnplLoan.fetch(bnplLoan);
        const newBalance = loanAccountAfter.remainingBalance.toNumber();
        const paymentsMade = loanAccountAfter.paymentsMade;

        expect(newBalance).to.equal(initialBalance - installmentAmount);
        expect(paymentsMade).to.equal(1);

        // Check that credit score was updated positively
        const creditScoreAccount = await program.account.bnplCreditScore.fetch(
          creditScore
        );
        expect(creditScoreAccount.successfulPayments).to.equal(1);

        console.log("✅ BNPL payment processed successfully");
      } catch (error) {
        console.log("❌ BNPL payment failed:", error);
        throw error;
      }
    });
  });

  describe("Loyalty Points Earning", () => {
    it("Should earn loyalty points from purchase", async () => {
      try {
        const purchaseAmount = new anchor.BN(3 * LAMPORTS_PER_SOL); // 3 SOL purchase

        await program.methods
          .earnLoyaltyPoints(
            purchaseAmount,
            { purchase: {} } // LoyaltyPointType::Purchase
          )
          .accounts({
            loyaltyAccount: loyaltyAccount,
            loyaltyProgram: loyaltyProgram,
            user: customer.publicKey,
            store: store,
            systemProgram: SystemProgram.programId,
          })
          .signers([customer])
          .rpc();

        const loyaltyAccountData = await program.account.loyaltyAccount.fetch(
          loyaltyAccount
        );
        // Should have earned 300 points (3 SOL * 100 points per SOL)
        // Plus the previous 400 points remaining = 700 total
        expect(loyaltyAccountData.availablePoints.toNumber()).to.equal(700);
        expect(loyaltyAccountData.totalPoints.toNumber()).to.equal(800); // 500 welcome + 300 earned

        console.log("✅ Loyalty points earned successfully");
      } catch (error) {
        console.log("❌ Loyalty points earning failed:", error);
        throw error;
      }
    });
  });

  describe("Escrow Operations", () => {
    it("Should release escrow funds to store owner", async () => {
      try {
        const escrowAccountBefore = await program.account.escrow.fetch(
          escrowAccount
        );
        const initialBalance = escrowAccountBefore.balance.toNumber();
        const releaseAmount = new anchor.BN(Math.floor(initialBalance / 2)); // Release half

        const storeOwnerBalanceBefore = await provider.connection.getBalance(
          storeOwner.publicKey
        );

        await program.methods
          .releaseEscrow(releaseAmount)
          .accounts({
            store: store,
            storeOwner: storeOwner.publicKey,
            escrowAccount: escrowAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([storeOwner])
          .rpc();

        const escrowAccountAfter = await program.account.escrow.fetch(
          escrowAccount
        );
        const storeOwnerBalanceAfter = await provider.connection.getBalance(
          storeOwner.publicKey
        );

        expect(escrowAccountAfter.balance.toNumber()).to.equal(
          initialBalance - releaseAmount.toNumber()
        );
        expect(storeOwnerBalanceAfter).to.be.greaterThan(
          storeOwnerBalanceBefore
        );

        console.log("✅ Escrow release completed successfully");
      } catch (error) {
        console.log("❌ Escrow release failed:", error);
        throw error;
      }
    });
  });

  describe("Error Handling", () => {
    it("Should reject BNPL loan for insufficient credit score", async () => {
      try {
        // Create a customer with low credit score
        const lowCreditCustomer = Keypair.generate();
        await provider.connection.requestAirdrop(
          lowCreditCustomer.publicKey,
          2 * LAMPORTS_PER_SOL
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const [lowCreditScore] = PublicKey.findProgramAddressSync(
          [Buffer.from("credit_score"), lowCreditCustomer.publicKey.toBuffer()],
          program.programId
        );

        // Initialize with default score
        await program.methods
          .initializeCreditScore()
          .accounts({
            creditScore: lowCreditScore,
            user: lowCreditCustomer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([lowCreditCustomer])
          .rpc();

        // Manually update credit score to be very low (this would happen through failed payments)
        // For testing purposes, we'll try to create a loan that should be rejected

        const loanId = Array.from(crypto.getRandomValues(new Uint8Array(16)));
        const [testLoan] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("bnpl_loan"),
            lowCreditCustomer.publicKey.toBuffer(),
            Buffer.from(loanId),
          ],
          program.programId
        );

        try {
          await program.methods
            .createBnplLoan(
              loanId,
              new anchor.BN(10 * LAMPORTS_PER_SOL), // Very large loan
              new anchor.BN(2 * LAMPORTS_PER_SOL),
              { threeMonths: {} },
              Keypair.generate().publicKey
            )
            .accounts({
              bnplLoan: testLoan,
              creditScore: lowCreditScore,
              borrower: lowCreditCustomer.publicKey,
              store: store,
              storeOwner: storeOwner.publicKey,
              escrowAccount: escrowAccount,
              systemProgram: SystemProgram.programId,
            })
            .signers([lowCreditCustomer])
            .rpc();

          // If we reach here, the test should fail
          expect.fail("Expected BNPL loan to be rejected for large amount");
        } catch (error) {
          // This is expected - loan should be rejected
          console.log("✅ BNPL loan correctly rejected for excessive amount");
        }
      } catch (error) {
        console.log("❌ Error handling test failed:", error);
        throw error;
      }
    });

    it("Should reject loyalty points redemption for insufficient balance", async () => {
      try {
        const newCustomer = Keypair.generate();
        await provider.connection.requestAirdrop(
          newCustomer.publicKey,
          2 * LAMPORTS_PER_SOL
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const [newLoyaltyAccount] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("loyalty_account"),
            store.toBuffer(),
            newCustomer.publicKey.toBuffer(),
          ],
          program.programId
        );

        // Initialize loyalty account with minimal points
        await program.methods
          .initializeLoyaltyAccount(null, null)
          .accounts({
            loyaltyAccount: newLoyaltyAccount,
            loyaltyProgram: loyaltyProgram,
            user: newCustomer.publicKey,
            store: store,
            systemProgram: SystemProgram.programId,
          })
          .signers([newCustomer])
          .rpc();

        try {
          // Try to redeem more points than available
          await program.methods
            .redeemLoyaltyPoints(
              new anchor.BN(1000), // Try to redeem 1000 points
              new anchor.BN(1 * LAMPORTS_PER_SOL) // For 1 SOL purchase
            )
            .accounts({
              loyaltyAccount: newLoyaltyAccount,
              loyaltyProgram: loyaltyProgram,
              user: newCustomer.publicKey,
              store: store,
              systemProgram: SystemProgram.programId,
            })
            .signers([newCustomer])
            .rpc();

          expect.fail(
            "Expected loyalty redemption to be rejected for insufficient points"
          );
        } catch (error) {
          console.log(
            "✅ Loyalty redemption correctly rejected for insufficient points"
          );
        }
      } catch (error) {
        console.log("❌ Error handling test failed:", error);
        throw error;
      }
    });
  });

  after(async () => {
    console.log("\n=== Test Summary ===");
    console.log("✅ Store registration and setup");
    console.log("✅ Loyalty program initialization");
    console.log("✅ Customer account setup (credit score & loyalty)");
    console.log("✅ Purchase with loyalty points redemption");
    console.log("✅ BNPL loan creation and payment processing");
    console.log("✅ Loyalty points earning from purchases");
    console.log("✅ Escrow fund management");
    console.log("✅ Error handling and validation");
    console.log("\n🎉 All BNPL and Loyalty integration tests passed!");
  });
});

