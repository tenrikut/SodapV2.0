import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import { useCallback } from "react";
import { toast } from "sonner";
import { ReturnRequest } from "./useReturnRequests";
import { handleWalletError } from "@/lib/walletErrorHandler";
import {
  monitorTransaction,
  TransactionStatus,
} from "@/lib/transactionMonitor";
import { deductLoyaltyPoints } from "../../../utils/program-interface";

export interface RefundTransactionResult {
  signature: string;
  status: "success" | "failed" | "pending";
}

/**
 * Helper function to manually check transaction status
 */
export const checkTransactionStatus = async (
  connection: Connection,
  signature: string
): Promise<TransactionStatus> => {
  try {
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });

    if (status.value === null) {
      return "pending";
    }

    if (status.value.err) {
      console.error("Transaction failed:", status.value.err);
      return "failed";
    }

    if (
      status.value.confirmationStatus === "confirmed" ||
      status.value.confirmationStatus === "finalized"
    ) {
      return "success";
    }

    return "pending";
  } catch (error) {
    console.error("Error checking transaction status:", error);
    return "failed";
  }
};

interface Purchase {
  id: string;
  transactionSignature: string;
  storeName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  receiptAddress: string;
  storeAddress: string;
  buyerAddress: string;
  purchaseTimestamp: number;
  totalAmount: number;
  paidAmount?: number; // Amount actually paid by user (for BNPL, this is the down payment)
  remainingAmount?: number; // Remaining amount for BNPL
  paymentMethod?: "direct" | "bnpl";
  bnplTerm?: "3" | "6" | "12";
  bnplStatus?: "active" | "completed" | "defaulted";
}

export const useRefundTransaction = () => {
  // Use 'processed' commitment for faster confirmation
  const { connection: walletConnection } = useConnection();
  const { publicKey: storeWallet, signTransaction } = useWallet();

  console.log("🔗 RefundTransaction hook initialized");
  console.log("📡 Connection endpoint:", walletConnection?.rpcEndpoint);
  console.log(
    "📍 Is devnet connection?",
    walletConnection?.rpcEndpoint?.includes("devnet")
  );
  console.log(
    "🚫 Is localhost connection?",
    walletConnection?.rpcEndpoint?.includes("localhost") ||
      walletConnection?.rpcEndpoint?.includes("127.0.0.1")
  );
  console.log("👛 Store wallet connected:", !!storeWallet);
  console.log("✍️ Sign transaction available:", !!signTransaction);

  const processRefund = useCallback(
    async (purchase: Purchase): Promise<RefundTransactionResult> => {
      console.log("🚀 Starting refund process for purchase:", purchase.id);
      console.log("💰 Refund amount:", purchase.totalAmount, "SOL");

      // Validate connection first
      if (!walletConnection) {
        throw new Error(
          "No connection to Solana network. Please check your internet connection."
        );
      }

      // Use a mutable connection variable for this function
      let connection = walletConnection;

      // Extract buyer wallet address from the purchase object
      let buyerWallet;
      try {
        if (purchase.buyerAddress) {
          buyerWallet = new PublicKey(purchase.buyerAddress);
        } else {
          throw new Error("Buyer wallet address is missing or invalid");
        }
      } catch (error) {
        console.error("Error creating buyer PublicKey:", error);
        throw new Error("Invalid buyer wallet address");
      }

      try {
        if (!storeWallet || !signTransaction) {
          throw new Error(
            "Store wallet not connected. Please connect the store manager wallet first."
          );
        }

        console.log("🔗 Refund - Connection endpoint:", connection.rpcEndpoint);
        console.log(
          "🏪 Refund - Store wallet address:",
          storeWallet.toString()
        );

        // Import WALLET_CONFIG to check if connected wallet is store manager
        const { WALLET_CONFIG } = await import("@/config/wallets");
        const expectedStoreWallet = WALLET_CONFIG.STORE_MANAGER;

        console.log("🔍 Expected store manager wallet:", expectedStoreWallet);
        console.log(
          "🔍 Connected wallet matches store manager:",
          storeWallet.toString() === expectedStoreWallet
        );

        if (storeWallet.toString() !== expectedStoreWallet) {
          throw new Error(
            `Wrong wallet connected! Expected store manager wallet (${expectedStoreWallet.substring(
              0,
              8
            )}...${expectedStoreWallet.substring(-8)}), but got (${storeWallet
              .toString()
              .substring(0, 8)}...${storeWallet
              .toString()
              .substring(
                -8
              )}). Please connect the correct store manager wallet.`
          );
        }

        // Test network connectivity first with wallet adapter connection
        try {
          console.log("🔄 Testing network connectivity for refund...");
          const latestBlockhash = await connection.getLatestBlockhash();
          console.log(
            "✅ Network test successful, latest blockhash:",
            latestBlockhash.blockhash
          );
        } catch (networkError) {
          console.error("❌ Wallet adapter connection failed:", networkError);

          // Try creating multiple direct connections to devnet as fallback
          console.log("🔄 Trying direct devnet connections as fallback...");
          const { Connection, clusterApiUrl } = await import("@solana/web3.js");

          const devnetEndpoints = [
            clusterApiUrl("devnet"), // Official devnet (fastest: 110ms)
            "https://api.devnet.solana.com", // Fast alternative (111ms)
            "https://solana-devnet.g.alchemy.com/v2/demo", // Slower but working (534ms)
            // Excluding helius due to API key requirement
          ];

          let successfulConnection = null;

          for (const endpoint of devnetEndpoints) {
            try {
              console.log(`🔗 Trying endpoint: ${endpoint}`);
              const testConnection = new Connection(endpoint, "confirmed");

              // Test with a timeout
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 10000)
              );

              const testBlockhash = await Promise.race([
                testConnection.getLatestBlockhash(),
                timeoutPromise,
              ]);

              console.log(`✅ Endpoint ${endpoint} successful!`);
              successfulConnection = testConnection;
              break;
            } catch (endpointError) {
              console.error(
                `❌ Endpoint ${endpoint} failed:`,
                endpointError.message
              );
            }
          }

          if (successfulConnection) {
            connection = successfulConnection;
            console.log(
              "🔄 Using successful direct connection for refund processing"
            );
          } else {
            throw new Error(
              `All network connections failed. Original error: ${networkError.message}. Please check your internet connection and try again.`
            );
          }
        }

        // Check store wallet balance first to ensure sufficient funds
        console.log("💰 Checking store wallet balance...");
        let balance;
        try {
          balance = await connection.getBalance(storeWallet);
          console.log(
            `Store wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`
          );
        } catch (balanceError) {
          console.error("❌ Failed to get store wallet balance:", balanceError);
          console.error("Balance error details:", {
            name: balanceError?.name,
            message: balanceError?.message,
            code: balanceError?.code,
          });

          // Try alternative endpoints if the primary fails
          console.log("🔄 Trying alternative RPC endpoints...");
          const alternativeEndpoints = [
            "https://devnet.helius-rpc.com",
            "https://solana-devnet.g.alchemy.com/v2/demo",
            "https://api.devnet.solana.com",
          ];

          let alternativeBalance = null;
          for (const endpoint of alternativeEndpoints) {
            try {
              console.log(`🔗 Trying alternative endpoint: ${endpoint}`);
              const { Connection } = await import("@solana/web3.js");
              const altConnection = new Connection(endpoint, "confirmed");

              // Test connectivity first
              await altConnection.getLatestBlockhash();

              // Try to get balance
              alternativeBalance = await altConnection.getBalance(storeWallet);
              console.log(
                `✅ Alternative endpoint success! Balance: ${
                  alternativeBalance / LAMPORTS_PER_SOL
                } SOL`
              );
              balance = alternativeBalance;
              break;
            } catch (altError) {
              console.error(
                `❌ Alternative endpoint ${endpoint} failed:`,
                altError.message
              );
            }
          }

          if (alternativeBalance === null) {
            throw new Error(
              `Failed to check store wallet balance using multiple endpoints. Original error: ${balanceError.message}. Please check your internet connection and try again.`
            );
          }
        }

        // Calculate refund amount based on payment method
        let refundAmount: number;
        
        if (purchase.paymentMethod === "bnpl") {
          // For BNPL purchases, only refund the amount actually paid (down payment)
          refundAmount = purchase.paidAmount || 0;
          console.log(`🏦 BNPL refund: User paid ${refundAmount} SOL (down payment), refunding this amount only`);
        } else {
          // For direct purchases, refund the full amount
          refundAmount = purchase.totalAmount || purchase.items.reduce(
            (total, item) => total + item.price * item.quantity,
            0
          );
          console.log(`💳 Direct purchase refund: Refunding full amount ${refundAmount} SOL`);
        }

        // Convert SOL to lamports
        const lamportsToSend = Math.round(refundAmount * LAMPORTS_PER_SOL);
        console.log(
          `Attempting to refund: ${refundAmount} SOL (${lamportsToSend} lamports)`
        );

        // Check if we have enough balance (including fees)
        const estimatedFee = 5000; // Estimated transaction fee in lamports
        if (balance < lamportsToSend + estimatedFee) {
          throw new Error(
            `Insufficient funds for refund. Need at least ${
              (lamportsToSend + estimatedFee) / LAMPORTS_PER_SOL
            } SOL, but have ${balance / LAMPORTS_PER_SOL} SOL`
          );
        }

        // Create refund transaction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: storeWallet,
            toPubkey: buyerWallet,
            lamports: lamportsToSend,
          })
        );

        // Get latest blockhash with processed commitment for faster confirmation
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("processed");
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = storeWallet;

        console.log("Transaction created, requesting signature...");

        // Implement retry logic for transaction sending
        const maxRetries = 3;
        let signature: string;
        let retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            // Sign transaction
            const signed = await signTransaction(transaction);
            console.log(
              `Transaction signed (attempt ${
                retryCount + 1
              }), sending to network...`
            );

            // Send transaction with improved settings
            signature = await connection.sendRawTransaction(
              signed.serialize(),
              {
                skipPreflight: false,
                preflightCommitment: "processed", // Faster preflight
                maxRetries: 2,
              }
            );

            console.log("Transaction sent successfully, signature:", signature);
            break; // Success, exit retry loop
          } catch (sendError) {
            retryCount++;
            console.error(
              `Transaction send attempt ${retryCount} failed:`,
              sendError
            );

            if (retryCount >= maxRetries) {
              // Handle specific error types
              if (sendError instanceof Error) {
                if (sendError.message.includes("insufficient funds")) {
                  throw new Error(
                    "Insufficient funds in store wallet. Please add SOL and try again."
                  );
                } else if (sendError.message.includes("User rejected")) {
                  throw new Error("Transaction was rejected by the user.");
                } else if (sendError.message.includes("blockhash")) {
                  throw new Error("Transaction expired. Please try again.");
                }
              }
              throw sendError;
            }

            // Wait before retry (exponential backoff)
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, retryCount) * 1000)
            );
          }
        }

        console.log("Waiting for confirmation...");

        // Wait for transaction confirmation with improved settings
        const status = await monitorTransaction(
          connection,
          signature,
          undefined, // No reference PublicKey needed
          {
            timeout: 45000, // 45 seconds timeout for better UX
            interval: 1500, // Check every 1.5 seconds for faster detection
            lastValidBlockHeight, // Pass the block height for expiry checking
          }
        );

        console.log("Transaction status:", status);

        // Handle timeout case specifically
        if (status === "timeout") {
          console.warn("Transaction timed out, but may still be processing");
          const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
          toast.warning(
            `Transaction is taking longer than expected. Check status: ${explorerUrl}`,
            { duration: 10000 }
          );
          return {
            signature,
            status: "pending",
          };
        }

        // If refund was successful, deduct loyalty points
        if (status === "success") {
          // Calculate the amount for loyalty point deduction (same as refund amount)
          const loyaltyDeductionAmount = purchase.paymentMethod === "bnpl" 
            ? (purchase.paidAmount || 0) 
            : (purchase.totalAmount || 0);
          
          console.log(`🎯 Loyalty deduction amount: ${loyaltyDeductionAmount} SOL (${purchase.paymentMethod === "bnpl" ? "BNPL down payment" : "full purchase"})`);
          
          try {
            console.log("🎯 Deducting loyalty points for refund...");
            
            // Try blockchain loyalty point deduction first
            const loyaltyResult = await deductLoyaltyPoints(
              connection,
              { publicKey: storeWallet, signTransaction },
              storeWallet,
              new PublicKey(purchase.buyerAddress),
              loyaltyDeductionAmount, // amount in SOL - only what user actually paid
              "Purchase"
            );

            if (loyaltyResult) {
              console.log("✅ Blockchain loyalty points deducted:", loyaltyResult);
              
              // Calculate points deducted (10 points per SOL) - based on amount actually paid
              const loyaltyPointsDeducted = Math.floor(loyaltyDeductionAmount * 10);
              
              // Update localStorage to reflect the deduction
              const existingLoyalty = localStorage.getItem("sodap-loyalty-earnings");
              let loyaltyEarnings = [];
              
              if (existingLoyalty) {
                try {
                  loyaltyEarnings = JSON.parse(existingLoyalty);
                } catch (e) {
                  console.error("❌ Error parsing loyalty earnings:", e);
                }
              }
              
              // Add deduction entry to localStorage
              const deductionEntry = {
                id: `refund_${Date.now()}`,
                date: new Date().toISOString().split("T")[0],
                type: "Refund Deduction",
                store: "Sodap Watch Store",
                points: -loyaltyPointsDeducted, // Negative to indicate deduction
                description: `Points deducted for refund of ${purchase.totalAmount} SOL`,
                blockchainSignature: loyaltyResult.signature,
              };
              
              loyaltyEarnings.unshift(deductionEntry);
              localStorage.setItem("sodap-loyalty-earnings", JSON.stringify(loyaltyEarnings));
              
              // Notify other components about the loyalty point change
              window.dispatchEvent(
                new CustomEvent("sodap-loyalty-updated", {
                  detail: { points: -loyaltyPointsDeducted },
                })
              );
              
              toast.success(
                `💰 Refund successful! ${loyaltyPointsDeducted} loyalty points deducted.`,
                { duration: 5000 }
              );
            }
          } catch (loyaltyError) {
            console.warn("Failed to deduct loyalty points:", loyaltyError);
            
            // Fallback: Add deduction to localStorage only
            const loyaltyPointsDeducted = Math.floor(loyaltyDeductionAmount * 10);
            const existingLoyalty = localStorage.getItem("sodap-loyalty-earnings");
            let loyaltyEarnings = [];
            
            if (existingLoyalty) {
              try {
                loyaltyEarnings = JSON.parse(existingLoyalty);
              } catch (e) {
                console.error("❌ Error parsing loyalty earnings:", e);
              }
            }
            
            // Add fallback deduction entry
            const deductionEntry = {
              id: `refund_${Date.now()}`,
              date: new Date().toISOString().split("T")[0],
              type: "Refund Deduction",
              store: "Sodap Watch Store",
              points: -loyaltyPointsDeducted,
              description: `Points deducted for refund of ${purchase.totalAmount} SOL (fallback)`,
              // No blockchainSignature for fallback
            };
            
            loyaltyEarnings.unshift(deductionEntry);
            localStorage.setItem("sodap-loyalty-earnings", JSON.stringify(loyaltyEarnings));
            
            window.dispatchEvent(
              new CustomEvent("sodap-loyalty-updated", {
                detail: { points: -loyaltyPointsDeducted },
              })
            );
            
            toast.success(
              `💰 Refund successful! ${loyaltyPointsDeducted} loyalty points deducted.`,
              { duration: 5000 }
            );
          }
        }

        // Return result
        return {
          signature,
          status: status === "success" ? "success" : "failed",
        };
      } catch (error) {
        console.error("Error processing refund:", error);

        // Enhanced error handling with specific error types
        let errorMessage = "Failed to process refund. ";

        if (error instanceof Error) {
          const message = error.message.toLowerCase();

          if (message.includes("insufficient funds")) {
            errorMessage =
              "Insufficient funds in store wallet. Please add SOL to the store wallet and try again.";
          } else if (
            message.includes("user rejected") ||
            message.includes("rejected")
          ) {
            errorMessage = "Transaction was rejected by the user.";
          } else if (
            message.includes("network") ||
            message.includes("connection")
          ) {
            errorMessage =
              "Network connection issue. Please check your internet connection and try again.";
          } else if (
            message.includes("timeout") ||
            message.includes("congested")
          ) {
            errorMessage =
              "Network congestion detected. The transaction may still be processing. Please check Solana Explorer.";
          } else if (
            message.includes("blockhash") ||
            message.includes("expired")
          ) {
            errorMessage = "Transaction expired. Please try again.";
          } else {
            errorMessage = `Transaction failed: ${error.message}`;
          }
        }

        const handleWalletErrorResult = handleWalletError(error);
        const finalErrorMessage = handleWalletErrorResult || errorMessage;

        toast.error(finalErrorMessage);
        throw error;
      }
    },
    [walletConnection, storeWallet, signTransaction]
  );

  return {
    processRefund,
    checkTransactionStatus: (signature: string) =>
      checkTransactionStatus(walletConnection, signature),
  };
};
