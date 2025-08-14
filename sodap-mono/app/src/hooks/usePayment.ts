import { useAnchor } from "@/hooks/useAnchor";
import { CartItem } from "@/types/cart";
import { Keypair, PublicKey, TransactionResponse } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { toast } from "sonner";

export interface PaymentResult {
  transactionSignature: string;
  receiptAddress: string;
  storeAddress: string;
  buyerAddress: string;
  totalAmount: number;
  timestamp: number;
  confirmed: boolean;
}

export const usePayment = () => {
  const { program, walletAddress, connection } = useAnchor();

  const processPayment = async (
    cartItems: CartItem[],
    storeId: string
  ): Promise<PaymentResult> => {
    // Early validation of required dependencies
    if (!program) {
      console.error("Program not initialized in usePayment hook");
      toast.error("Payment system not initialized");
      throw new Error("Program not initialized");
    }

    if (!walletAddress) {
      console.error("Wallet not connected");
      toast.error("Please connect your wallet");
      throw new Error("Wallet not connected");
    }

    if (!connection) {
      console.error("No connection to Solana network");
      toast.error("Network connection error");
      throw new Error("No connection to Solana network");
    }

    // Debug: Check program and connection
    console.log("🔗 Connection info:", {
      endpoint: connection.rpcEndpoint,
      programId: program.programId.toString(),
    });

    // Test connection before proceeding
    try {
      console.log("🔄 Testing network connectivity...");
      const latestBlockhash = await connection.getLatestBlockhash();
      console.log(
        "✅ Network test successful, latest blockhash:",
        latestBlockhash.blockhash
      );
    } catch (networkError) {
      console.error("❌ Network connectivity test failed:", networkError);
      throw new Error(
        `Network connection failed: ${networkError.message}. Please check your internet connection and try again.`
      );
    }

    try {
      // Get store data from localStorage
      const storeData = localStorage.getItem(`sodap-store-wallet-${storeId}`);
      if (!storeData) {
        throw new Error(`Store data not found for store ${storeId}`);
      }

      // Parse store data to get store wallet and owner wallet
      const { pda: storeWallet, pub: storeOwnerWallet } = JSON.parse(storeData);
      if (!storeWallet || !storeOwnerWallet) {
        throw new Error("Invalid store wallet data");
      }

      // Debug: Check wallet balance first
      const walletPubkey = new PublicKey(walletAddress);
      const walletBalance = await connection.getBalance(walletPubkey);
      console.log("💰 Wallet balance:", walletBalance / 1e9, "SOL");

      // Create a new receipt account
      const receipt = Keypair.generate();

      // Calculate total amount in lamports
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      const totalAmountLamports = new BN(totalAmount * 1e9);

      console.log("🛒 Payment details:", {
        totalAmount: totalAmount + " SOL",
        totalAmountLamports: totalAmountLamports.toString(),
        storeWallet,
        walletAddress,
        productCount: cartItems.length,
      });

      // Check if wallet has enough balance
      const requiredBalance = totalAmountLamports.toNumber() + 10000000; // Add ~0.01 SOL for fees
      if (walletBalance < requiredBalance) {
        throw new Error(
          `Insufficient funds! Required: ${
            requiredBalance / 1e9
          } SOL, Available: ${walletBalance / 1e9} SOL`
        );
      }

      // Debug: Check if store account exists
      const storeAccountInfo = await connection.getAccountInfo(
        new PublicKey(storeWallet)
      );
      console.log("🏪 Store account info:", {
        exists: !!storeAccountInfo,
        lamports: storeAccountInfo?.lamports || 0,
        owner: storeAccountInfo?.owner?.toString(),
      });

      if (!storeAccountInfo) {
        throw new Error(
          "Store account not found! Store may not be properly initialized."
        );
      }

      // Convert cart items to the format expected by the program
      const productIds = cartItems.map(
        (item) => new PublicKey(item.product.id)
      );
      const quantities = cartItems.map((item) => new BN(item.quantity));

      console.log("📦 Cart items:", {
        productIds: productIds.map((p) => p.toString()),
        quantities: quantities.map((q) => q.toString()),
      });

      // Calculate gas fee (estimate)
      const gasFee = new BN(5000); // 0.000005 SOL

      // Create the transaction with the correct accounts
      // Send the transaction
      const tx = await program.methods
        .purchaseCart(
          productIds,
          quantities.map((q) => new BN(q)),
          totalAmountLamports
        )
        .accounts({
          store: new PublicKey(storeWallet),
          receipt: receipt.publicKey,
          buyer: new PublicKey(walletAddress),
        })
        .signers([receipt])
        .rpc();

      console.log("Transaction sent:", tx);

      // Wait for transaction confirmation
      const confirmation = await connection.confirmTransaction(tx, "confirmed");

      if (confirmation.value.err) {
        throw new Error("Transaction failed to confirm");
      }

      // Get transaction details
      const txDetails = await connection.getTransaction(tx, {
        maxSupportedTransactionVersion: 0,
      });

      if (!txDetails) {
        throw new Error("Failed to fetch transaction details");
      }

      // Award loyalty points after successful payment (localStorage only)
      console.log("🎁 Starting loyalty points process...");
      console.log("💰 Payment amount:", totalAmount, "SOL");

      try {
        const loyaltyPointsEarned = Math.floor(totalAmount * 10); // 10 points per SOL
        console.log("🎯 Loyalty points to award:", loyaltyPointsEarned);

        const existingLoyalty = localStorage.getItem("sodap-loyalty-earnings");
        console.log("📦 Existing loyalty data:", existingLoyalty);

        let loyaltyEarnings = [];
        if (existingLoyalty) {
          try {
            loyaltyEarnings = JSON.parse(existingLoyalty);
            console.log("📋 Parsed existing loyalty data:", loyaltyEarnings);
          } catch (e) {
            console.error("❌ Error parsing loyalty earnings:", e);
          }
        }

        const newLoyaltyEntry = {
          id: `purchase_${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          type: "Purchase",
          store: "Sodap Watch Store",
          points: loyaltyPointsEarned,
          description: `Purchase payment for ${totalAmount} SOL`,
          transactionSignature: tx,
        };

        console.log("📝 New loyalty entry:", newLoyaltyEntry);

        loyaltyEarnings.unshift(newLoyaltyEntry);
        console.log("📊 Updated loyalty earnings array:", loyaltyEarnings);

        const loyaltyDataString = JSON.stringify(loyaltyEarnings);
        localStorage.setItem("sodap-loyalty-earnings", loyaltyDataString);
        console.log("💾 Saved to localStorage:", loyaltyDataString);

        // Verify it was saved
        const verification = localStorage.getItem("sodap-loyalty-earnings");
        console.log("✅ Verification - data in localStorage:", verification);

        console.log("✅ Added loyalty points:", loyaltyPointsEarned);

        // Dispatch custom event to notify other components
        window.dispatchEvent(
          new CustomEvent("sodap-loyalty-updated", {
            detail: { points: loyaltyPointsEarned },
          })
        );

        toast.success(
          `🎉 Payment successful! Earned ${loyaltyPointsEarned} loyalty points!`
        );
      } catch (loyaltyError) {
        console.warn("Failed to award loyalty points:", loyaltyError);
        toast.success("Payment processed and confirmed successfully!");
      }

      // Return detailed payment result
      const result: PaymentResult = {
        transactionSignature: tx,
        receiptAddress: receipt.publicKey.toString(),
        storeAddress: storeWallet,
        buyerAddress: walletAddress,
        totalAmount: totalAmount,
        timestamp: txDetails.blockTime
          ? txDetails.blockTime
          : Math.floor(Date.now() / 1000),
        confirmed: true,
      };

      return result;
    } catch (error) {
      console.error("💥 Payment processing error:", error);

      // Handle SendTransactionError specifically to get logs
      if (
        error &&
        typeof error === "object" &&
        "getLogs" in error &&
        typeof error.getLogs === "function"
      ) {
        try {
          const logs = await error.getLogs();
          console.error("📋 Transaction logs:", logs);
        } catch (logError) {
          console.error("Failed to get transaction logs:", logError);
        }
      }

      // Also log the raw error details
      console.error("🔍 Error details:", {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        programErrorCode: error?.programErrorCode,
        logs: error?.logs,
      });

      // Provide more specific error messages
      let errorMessage = "Payment processing failed";
      if (error instanceof Error) {
        if (error.message.includes("insufficient")) {
          errorMessage = "Insufficient funds for this purchase";
        } else if (error.message.includes("not found")) {
          errorMessage = "Store or product not found";
        } else if (error.message.includes("Simulation failed")) {
          errorMessage = `Transaction simulation failed: ${error.message}`;
        } else if (error.message.includes("no record of a prior credit")) {
          errorMessage =
            "Account funding error - please check your wallet balance and network connection";
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);
      throw error;
    }
  };

  return { processPayment };
};
