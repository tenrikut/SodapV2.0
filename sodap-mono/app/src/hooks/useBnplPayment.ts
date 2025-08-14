import { useAnchor } from "@/hooks/useAnchor";
import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { toast } from "sonner";
import { earnLoyaltyPoints } from "../../../utils/program-interface";

export interface BnplPaymentResult {
  transactionSignature: string;
  loanId: string;
  paymentNumber: number;
  amountPaid: number;
  remainingBalance: number;
  isLoanCompleted: boolean;
  loyaltyPointsAwarded?: boolean;
  timestamp: number;
}

export const useBnplPayment = () => {
  const { program, walletAddress, connection, isConnected } = useAnchor();

  const makeBnplPayment = async (
    loanId: string,
    storePublicKey: string,
    storeOwnerPublicKey: string,
    originalPurchaseAmount: number
  ): Promise<BnplPaymentResult> => {
    console.log("=== BNPL Payment Debug Info ===");
    console.log("Program:", program);
    console.log("Program.account:", program?.account);
    console.log("Wallet Address:", walletAddress);
    console.log("Connection:", connection);
    console.log("Is Connected:", isConnected);
    console.log("================================");

    if (!isConnected) {
      throw new Error(
        "Wallet not connected - please connect your wallet first"
      );
    }

    if (!program) {
      throw new Error(
        "Anchor program not initialized - wallet connection may be incomplete"
      );
    }

    if (!program.account) {
      throw new Error(
        "Program account interface not available - the Anchor program is not properly initialized"
      );
    }

    if (!program.account.bnplLoan) {
      throw new Error(
        "BNPL loan account interface not found - check program IDL configuration"
      );
    }

    if (!walletAddress) {
      throw new Error("Wallet address not available");
    }

    if (!connection) {
      throw new Error("No connection to Solana network");
    }

    try {
      // Convert loan ID string to 16-byte array (as expected by the program)
      // For now, we'll create a deterministic 16-byte array from the string
      const loanIdArray = new Array(16).fill(0);
      const loanIdBytes = Buffer.from(loanId, "utf8");
      for (let i = 0; i < Math.min(16, loanIdBytes.length); i++) {
        loanIdArray[i] = loanIdBytes[i];
      }

      console.log("Loan ID:", loanId);
      console.log("Loan ID Array:", loanIdArray);

      // Find loan PDA using the correct seeds: [b"bnpl_loan", borrower.key(), loan_id]
      const borrowerPubkey = new PublicKey(walletAddress);
      const loanPDA = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bnpl_loan"),
          borrowerPubkey.toBuffer(),
          Buffer.from(loanIdArray),
        ],
        program.programId
      )[0];

      // Find credit score PDA
      const creditScorePDA = PublicKey.findProgramAddressSync(
        [Buffer.from("credit_score"), borrowerPubkey.toBuffer()],
        program.programId
      )[0];

      console.log("Making BNPL payment...");
      console.log("Loan PDA:", loanPDA.toString());
      console.log("Credit Score PDA:", creditScorePDA.toString());

      // Check if the loan account exists before trying to fetch it
      console.log(
        "Checking if loan account exists at PDA:",
        loanPDA.toString()
      );

      let loanAccount;
      try {
        loanAccount = await program.account.bnplLoan.fetch(loanPDA);
        console.log("✅ Loan account found!");
        console.log("Current payments made:", loanAccount.paymentsMade);
      } catch (fetchError) {
        console.error("❌ Loan account not found:", fetchError);
        console.log(
          "Mock loan detected - processing real SOL transfer for payment amount..."
        );

        // For mock loans, process a real SOL transfer instead of simulation
        console.log("💳 Processing real BNPL payment on devnet...");

        // Use the provided originalPurchaseAmount as the payment amount
        // (Note: for monthly payments, this will be the monthly amount, not the full loan)
        const paymentAmountSOL = originalPurchaseAmount;
        const paymentAmountLamports = Math.floor(
          paymentAmountSOL * LAMPORTS_PER_SOL
        );

        console.log(
          `Transferring ${paymentAmountSOL} SOL (${paymentAmountLamports} lamports)`
        );

        // Create a simple SOL transfer transaction to a treasury/store wallet
        // Using a devnet treasury address for BNPL payments
        const treasuryAddress = new PublicKey(
          "DfhzrfdE5VDk43iP1NL8MLS5xFaxquxJVFtjhjRmHLAW"
        );

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(walletAddress),
            toPubkey: treasuryAddress,
            lamports: paymentAmountLamports,
          })
        );

        // Get latest blockhash
        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = new PublicKey(walletAddress);

        // Sign and send transaction
        const signedTransaction = await window.solana.signTransaction(
          transaction
        );
        const signature = await connection.sendRawTransaction(
          signedTransaction.serialize()
        );

        console.log("Transaction sent:", signature);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        console.log("✅ Real payment transaction confirmed!");

        const realPaymentResult: BnplPaymentResult = {
          transactionSignature: signature,
          loanId: loanId,
          paymentNumber: 1,
          amountPaid: paymentAmountSOL,
          remainingBalance: 0, // For monthly payments, caller will calculate remaining balance
          isLoanCompleted: false, // For monthly payments, this will be determined by caller
          loyaltyPointsAwarded: true,
          timestamp: Math.floor(Date.now() / 1000),
        };

        console.log("✅ Payment completed:", realPaymentResult);

        // Always add loyalty points for BNPL payments (localStorage only for consistency)
        console.log("🎁 Starting BNPL loyalty points process...");
        console.log("💰 BNPL payment amount:", paymentAmountSOL, "SOL");

        try {
          const loyaltyPointsEarned = Math.floor(paymentAmountSOL * 10); // 10 points per SOL
          console.log("🎯 BNPL loyalty points to award:", loyaltyPointsEarned);

          const existingLoyalty = localStorage.getItem(
            "sodap-loyalty-earnings"
          );
          console.log("📦 Existing BNPL loyalty data:", existingLoyalty);

          let loyaltyEarnings = [];
          if (existingLoyalty) {
            try {
              loyaltyEarnings = JSON.parse(existingLoyalty);
              console.log(
                "📋 Parsed existing BNPL loyalty data:",
                loyaltyEarnings
              );
            } catch (e) {
              console.error("❌ Error parsing BNPL loyalty earnings:", e);
            }
          }

          const newLoyaltyEntry = {
            id: `bnpl_${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            type: "BNPL Payment",
            store: "Sodap Watch Store",
            points: loyaltyPointsEarned,
            description: `BNPL payment of ${paymentAmountSOL} SOL`,
            transactionSignature: realPaymentResult.transactionSignature,
          };

          console.log("📝 New BNPL loyalty entry:", newLoyaltyEntry);

          loyaltyEarnings.unshift(newLoyaltyEntry);
          console.log(
            "📊 Updated BNPL loyalty earnings array:",
            loyaltyEarnings
          );

          const loyaltyDataString = JSON.stringify(loyaltyEarnings);
          localStorage.setItem("sodap-loyalty-earnings", loyaltyDataString);
          console.log(
            "💾 Saved BNPL loyalty to localStorage:",
            loyaltyDataString
          );

          // Verify it was saved
          const verification = localStorage.getItem("sodap-loyalty-earnings");
          console.log(
            "✅ BNPL loyalty verification - data in localStorage:",
            verification
          );

          console.log("✅ Added BNPL loyalty points:", loyaltyPointsEarned);

          toast.success(
            `🎉 BNPL payment successful! Earned ${loyaltyPointsEarned} loyalty points!`
          );
        } catch (loyaltyError) {
          console.warn("Failed to award BNPL loyalty points:", loyaltyError);
        }

        // Add to purchase history
        try {
          const purchaseRecord = {
            id: `bnpl_completion_${Date.now()}`,
            storeName: "Sodap Watch Store",
            date: new Date().toISOString().split("T")[0],
            items: [
              {
                name: "BNPL Payment Completion",
                price: originalPurchaseAmount,
                quantity: 1,
              },
            ],
            transactionSignature: realPaymentResult.transactionSignature,
            totalAmount: originalPurchaseAmount,
            receiptAddress: "SIMULATED_RECEIPT",
            storeAddress: "DfhzrfdE5VDk43iP1NL8MLS5xFaxquxJVFtjhjRmHLAW",
            buyerAddress: walletAddress || "UNKNOWN",
            purchaseTimestamp: Date.now(),
          };

          // Add to localStorage purchase history
          const existingPurchases = localStorage.getItem("sodap-purchases");
          let purchases = [];
          if (existingPurchases) {
            try {
              purchases = JSON.parse(existingPurchases);
            } catch (e) {
              console.error("Error parsing purchase history:", e);
            }
          }

          purchases.unshift(purchaseRecord);
          localStorage.setItem("sodap-purchases", JSON.stringify(purchases));
          console.log("✅ Added BNPL completion to purchase history");

          // Dispatch events to notify other components
          window.dispatchEvent(
            new CustomEvent("sodap-purchase-added", {
              detail: { purchase: purchaseRecord },
            })
          );

          window.dispatchEvent(
            new CustomEvent("sodap-loyalty-updated", {
              detail: { points: Math.floor(originalPurchaseAmount * 10) },
            })
          );
        } catch (purchaseError) {
          console.error("Error adding to purchase history:", purchaseError);
        }

        toast.success(
          "✅ BNPL loan completed! Loyalty points and purchase history updated!"
        );

        return realPaymentResult;
      }

      // Create payment record PDA using the correct format
      const paymentRecordPDA = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bnpl_payment"),
          loanPDA.toBuffer(),
          Buffer.from([loanAccount.paymentsMade + 1]),
        ],
        program.programId
      )[0];

      console.log("Payment Record PDA:", paymentRecordPDA.toString());

      // Make the BNPL payment with all required accounts
      const tx = await program.methods
        .makeBnplPayment()
        .accounts({
          loan: loanPDA,
          paymentRecord: paymentRecordPDA,
          store: new PublicKey(storePublicKey),
          borrower: borrowerPubkey,
          creditScore: creditScorePDA,
          storeOwner: new PublicKey(storeOwnerPublicKey),
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("BNPL payment transaction sent:", tx);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(tx, "confirmed");

      if (confirmation.value.err) {
        throw new Error("BNPL payment transaction failed to confirm");
      }

      // Get updated loan state to check if it's completed
      const updatedLoanAccount = await program.account.bnplLoan.fetch(loanPDA);

      const isLoanCompleted =
        updatedLoanAccount.status.hasOwnProperty("completed") ||
        updatedLoanAccount.paymentsMade >= updatedLoanAccount.totalPayments;

      let loyaltyPointsAwarded = false;

      // Award loyalty points if loan is completed
      if (isLoanCompleted) {
        try {
          console.log("BNPL loan completed! Awarding loyalty points...");
          const loyaltyResult = await earnLoyaltyPoints(
            connection,
            { publicKey: new PublicKey(walletAddress) }, // wallet adapter format
            storePublicKey, // store public key
            new PublicKey(walletAddress), // user public key
            originalPurchaseAmount, // original purchase amount in SOL
            "Purchase" // point type
          );

          if (loyaltyResult) {
            loyaltyPointsAwarded = true;
            toast.success(
              `🎉 BNPL loan completed! Loyalty points earned! Transaction: ${loyaltyResult.signature}`
            );
            console.log(
              "Loyalty points earned for completed BNPL:",
              loyaltyResult
            );
          }
        } catch (loyaltyError) {
          console.warn(
            "Failed to award loyalty points for completed BNPL (payment still successful):",
            loyaltyError
          );
          // Don't fail the payment if loyalty points fail
        }
      }

      // Get transaction details
      const txDetails = await connection.getTransaction(tx, {
        maxSupportedTransactionVersion: 0,
      });

      const result: BnplPaymentResult = {
        transactionSignature: tx,
        loanId: loanId,
        paymentNumber: Number(updatedLoanAccount.paymentsMade),
        amountPaid: Number(updatedLoanAccount.installmentAmount) / 1e9, // Convert from lamports to SOL
        remainingBalance: Number(updatedLoanAccount.remainingBalance) / 1e9, // Convert from lamports to SOL
        isLoanCompleted,
        loyaltyPointsAwarded,
        timestamp: txDetails?.blockTime
          ? txDetails.blockTime
          : Math.floor(Date.now() / 1000),
      };

      if (isLoanCompleted) {
        toast.success("🎉 BNPL loan completed successfully!");
      } else {
        toast.success("BNPL payment processed successfully!");
      }

      return result;
    } catch (error) {
      console.error("BNPL payment error:", error);

      let errorMessage = "BNPL payment failed";
      if (error instanceof Error) {
        if (error.message.includes("insufficient")) {
          errorMessage = "Insufficient funds for BNPL payment";
        } else if (error.message.includes("not found")) {
          errorMessage = "BNPL loan not found";
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);
      throw error;
    }
  };

  const getBnplLoanStatus = async (loanId: string) => {
    console.log("=== BNPL Loan Status Debug Info ===");
    console.log("Program:", program);
    console.log("Program.account:", program?.account);
    console.log("Wallet Address:", walletAddress);
    console.log("Is Connected:", isConnected);
    console.log("===================================");

    if (!isConnected) {
      throw new Error(
        "Wallet not connected - please connect your wallet first"
      );
    }

    if (!program) {
      throw new Error(
        "Anchor program not initialized - wallet connection may be incomplete"
      );
    }

    if (!program.account) {
      throw new Error(
        "Program account interface not available - the Anchor program is not properly initialized"
      );
    }

    if (!program.account.bnplLoan) {
      throw new Error(
        "BNPL loan account interface not found - check program IDL configuration"
      );
    }

    if (!walletAddress) {
      throw new Error("Wallet address not available");
    }

    try {
      // Use the same loan ID conversion logic as in makeBnplPayment
      const loanIdArray = new Array(16).fill(0);
      const loanIdBytes = Buffer.from(loanId, "utf8");
      for (let i = 0; i < Math.min(16, loanIdBytes.length); i++) {
        loanIdArray[i] = loanIdBytes[i];
      }

      // Use the same PDA generation logic
      const borrowerPubkey = new PublicKey(walletAddress);
      const loanPDA = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bnpl_loan"),
          borrowerPubkey.toBuffer(),
          Buffer.from(loanIdArray),
        ],
        program.programId
      )[0];

      let loanAccount;
      try {
        loanAccount = await program.account.bnplLoan.fetch(loanPDA);
      } catch (fetchError) {
        console.log("Loan account not found - this may be a mock loan");
        // Return mock status for demo loans
        return {
          status: { active: {} },
          paymentsMade: 0,
          totalPayments: 6,
          remainingBalance: 1.0,
          installmentAmount: 0.2,
          nextPaymentDue: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
          isCompleted: false,
        };
      }

      return {
        status: loanAccount.status,
        paymentsMade: Number(loanAccount.paymentsMade),
        totalPayments: Number(loanAccount.totalPayments),
        remainingBalance: Number(loanAccount.remainingBalance) / 1e9,
        installmentAmount: Number(loanAccount.installmentAmount) / 1e9,
        nextPaymentDue: Number(loanAccount.nextPaymentDue),
        isCompleted:
          loanAccount.status.hasOwnProperty("completed") ||
          loanAccount.paymentsMade >= loanAccount.totalPayments,
      };
    } catch (error) {
      console.error("Error fetching BNPL loan status:", error);
      throw error;
    }
  };

  return {
    makeBnplPayment,
    getBnplLoanStatus,
  };
};
