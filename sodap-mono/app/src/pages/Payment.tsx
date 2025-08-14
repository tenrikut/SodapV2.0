import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { WALLET_CONFIG } from "@/config/wallets";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProfileProvider, useProfile } from "@/contexts/ProfileContext";
import { useAnchor } from "@/hooks/useAnchor";
import {
  createPurchaseTransaction,
  sendTransaction,
} from "@/utils/transactionBuilder";
import { PaymentDetailsCard } from "@/components/payment/PaymentDetailsCard";
import { PaymentSuccessDialog } from "@/components/payment/PaymentSuccessDialog";
import {
  PaymentMethodDialog,
  PaymentMethodSelection,
} from "@/components/payment/PaymentMethodDialog";
import { useCart } from "@/hooks/useCart";
import { usePurchaseHistory } from "@/hooks/usePurchaseHistory";
import { useReturnRequests } from "@/hooks/useReturnRequests";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// Content component that uses the profile context
const PaymentContent: React.FC = (): React.ReactElement => {
  const navigate = useNavigate();
  const { userProfile } = useProfile();
  const {
    walletAddress,
    connectWallet,
    isConnected,
    isLoading,
    connection,
    program,
  } = useAnchor();
  const { cartItems, clearCart } = useCart();
  const { addPurchase } = usePurchaseHistory();
  const { createReturnRequest, refreshRequests } = useReturnRequests();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cartTotal, setCartTotal] = useState("0");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethodSelection | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<
    string | null
  >(null);

  // Get the store ID from the URL params or session storage
  // This ensures we're making transactions for the selected store
  const [storeId, setStoreId] = useState<string>(
    // Default store ID if none is found
    "4eLJ3QGiNrPN6UUr2fNxq6tUZqFdBMVpXkL2MhsKNriv"
  );

  useEffect(() => {
    // Get cart total from session storage
    const total = sessionStorage.getItem("cartTotal");
    if (total) {
      setCartTotal(total);
    } else {
      // If no total found, redirect back to cart
      toast.error("No payment amount found. Redirecting to cart...");
      navigate("/cart");
      return;
    }

    // If cart is empty, redirect back to cart
    if (cartItems.length === 0) {
      toast.error("Your cart is empty. Redirecting to cart...");
      navigate("/cart");
      return;
    }

    // Get store ID from URL params or session storage
    const params = new URLSearchParams(window.location.search);
    const storeIdParam = params.get("storeId");
    const storedStoreId = sessionStorage.getItem("selectedStoreId");

    if (storeIdParam) {
      setStoreId(storeIdParam);
      console.log("Using store ID from URL params:", storeIdParam);
    } else if (storedStoreId) {
      setStoreId(storedStoreId);
      console.log("Using store ID from session storage:", storedStoreId);
    } else {
      console.log("No store ID found, using default ID:", storeId);
    }
  }, [navigate, walletAddress, cartItems, storeId]);

  useEffect(() => {
    console.log("🔍 Payment page wallet status check:", {
      walletAddress,
      isConnected,
      isLoading,
      isProcessing,
    });

    // Set a timeout to check wallet connection status
    const timeoutId = setTimeout(() => {
      if (!walletAddress && !isProcessing) {
        console.log("❌ No wallet address found, showing connection prompt");
        toast.info("Please connect your wallet to proceed with payment");
      } else if (walletAddress) {
        console.log("✅ Wallet is connected:", walletAddress);
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [walletAddress, isConnected, isLoading, isProcessing, connectWallet]);

  const handleConnectWallet = async (): Promise<void> => {
    console.log("🔄 Payment page: handleConnectWallet called");
    try {
      console.log("🔄 Payment page: About to call connectWallet()");
      const success = await connectWallet();
      console.log("🔄 Payment page: connectWallet() returned:", success);

      if (success) {
        console.log("✅ Payment page: Wallet connection successful");
        toast.success("Wallet connected successfully!");
      } else {
        console.log("❌ Payment page: Wallet connection failed");
        toast.error("Failed to connect wallet. Please try again.");
      }
    } catch (error) {
      console.error("💥 Payment page: Error in handleConnectWallet:", error);
      console.error("Error details:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });
      toast.error(
        `Connection error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Get store wallet address from session storage
  const [storeWalletAddress, setStoreWalletAddress] = useState<string>("");
  const [storePda, setStorePda] = useState<string>("");

  useEffect(() => {
    // Get the current selected store ID
    const selectedStoreId = sessionStorage.getItem("selectedStoreId");
    console.log("Selected store ID:", selectedStoreId);

    // Special case for Sodap Watch Store (ID: 5)
    // ALWAYS use these hardcoded values for this store to ensure it works
    if (selectedStoreId === "5") {
      const fixedWalletAddress = WALLET_CONFIG.STORE_MANAGER;
      const fixedPdaAddress = "48s53bf2fe5MbhjxXquxan3W7QsNvjD5qDioJjVTPJEF";

      setStoreWalletAddress(fixedWalletAddress);
      setStorePda(fixedPdaAddress);

      // Save store wallet and PDA to session storage
      sessionStorage.setItem("selectedStoreWallet", fixedWalletAddress);
      sessionStorage.setItem("selectedStorePda", fixedPdaAddress);

      console.log("Using store wallet:", fixedWalletAddress);
      console.log("Using store PDA:", fixedPdaAddress);

      // Save to localStorage for the admin dashboard
      localStorage.setItem(
        "sodap-store-wallet-5",
        JSON.stringify({
          pub: fixedWalletAddress,
          sec: "58cb156e8e089675e3ba385e8b0db1853a0a7fb39d4257030be4dca2964050dd", // Keep existing private key
          pda: fixedPdaAddress,
        })
      );
    } else {
      // For other stores, use the saved wallet address
      const savedStoreWallet = sessionStorage.getItem("selectedStoreWallet");
      if (savedStoreWallet) {
        setStoreWalletAddress(savedStoreWallet);
        console.log("Found store wallet address:", savedStoreWallet);
      } else {
        console.warn("No wallet address found for selected store");
      }

      // Get store PDA from session storage
      const savedStorePda = sessionStorage.getItem("selectedStorePda");
      if (savedStorePda) {
        setStorePda(savedStorePda);
        console.log("Found store PDA address:", savedStorePda);
      }
    }

    // 🔧 FIX: Ensure customer wallet is different from store wallet
    const currentWalletAddress = sessionStorage.getItem("walletAddress");
    const storeWalletAddr =
      selectedStoreId === "5"
        ? WALLET_CONFIG.STORE_MANAGER
        : sessionStorage.getItem("selectedStoreWallet");

    // If user wallet is same as store wallet, clear it and force re-connection
    if (currentWalletAddress === storeWalletAddr) {
      console.warn(
        "⚠️ User wallet same as store wallet! Clearing session to force proper customer wallet setup."
      );
      sessionStorage.removeItem("walletAddress");
      // Set up Batur as default customer for testing
      sessionStorage.setItem("username", "Batur");
      sessionStorage.setItem("userWallet", WALLET_CONFIG.DEFAULT_BUYER);
      console.log(
        "✅ Set up customer wallet (Batur):",
        WALLET_CONFIG.DEFAULT_BUYER
      );
    }

    // Ensure we have a proper customer setup
    const username = sessionStorage.getItem("username");
    if (!username) {
      // Default to Batur customer for testing
      sessionStorage.setItem("username", "Batur");
      sessionStorage.setItem("userWallet", WALLET_CONFIG.DEFAULT_BUYER);
      console.log(
        "✅ Created default customer (Batur):",
        WALLET_CONFIG.DEFAULT_BUYER
      );
    }
  }, []);

  const handlePayment = async (): Promise<void> => {
    // First check wallet connection
    const username = sessionStorage.getItem("username");
    const userWallet = sessionStorage.getItem("userWallet");

    if (username === "Batur" && userWallet) {
      // Use Batur's wallet directly without connecting
      console.log("Using Batur's wallet for payment:", userWallet);
    } else if (!walletAddress) {
      // Try to connect wallet first for other users
      toast.info("Connecting wallet...");
      const success = await connectWallet();
      if (!success) {
        toast.error("Please connect your wallet first");
        return;
      }
    }

    // Show payment method selection dialog
    setShowPaymentMethodDialog(true);
  };

  const handlePaymentMethodSelect = async (
    selection: PaymentMethodSelection
  ): Promise<void> => {
    setShowPaymentMethodDialog(false);
    setSelectedPaymentMethod(selection);

    // Proceed with the actual payment based on selected method
    await processPayment(selection);
  };

  const processPayment = async (
    paymentSelection: PaymentMethodSelection
  ): Promise<void> => {
    try {
      setIsProcessing(true);
      console.log(
        "Starting payment process with method:",
        paymentSelection.method
      );

      // Get user wallet address
      const userWallet = sessionStorage.getItem("userWallet");

      // Calculate payment amount based on payment method
      const totalAmount = parseFloat(cartTotal);
      let paymentAmount: number;
      let pointsRedeemed = 0;
      let pointsValue = 0;

      // Handle points redemption
      if (paymentSelection.pointsToRedeem && paymentSelection.pointsToRedeem > 0) {
        pointsRedeemed = paymentSelection.pointsToRedeem;
        pointsValue = paymentSelection.pointsRedemptionValue || 0;
        console.log(`🎁 Redeeming ${pointsRedeemed} points (${pointsValue} SOL value)`);
      }

      if (paymentSelection.method === "direct") {
        paymentAmount = paymentSelection.finalPaymentAmount || totalAmount;
        console.log("Direct payment - Amount after points:", paymentAmount);
        if (pointsRedeemed > 0) {
          console.log(`💰 Original: ${totalAmount} SOL, Points discount: ${pointsValue} SOL, Final: ${paymentAmount} SOL`);
        }
      } else {
        // BNPL - calculate downpayment on final amount after points redemption
        const effectiveTotal = paymentSelection.finalPaymentAmount || totalAmount;
        paymentAmount = paymentSelection.downpaymentAmount || effectiveTotal * 0.2;
        console.log(
          "BNPL payment - Downpayment:",
          paymentAmount,
          "Effective Total:",
          effectiveTotal,
          "Original Total:",
          totalAmount
        );
        console.log("BNPL Term:", paymentSelection.bnplTerm, "months");
        if (pointsRedeemed > 0) {
          console.log(`🎁 Points redeemed: ${pointsRedeemed} (${pointsValue} SOL discount)`);
        }
      }

      if (!connection) {
        toast.error("Connection to Solana not established");
        setIsProcessing(false);
        return;
      }

      // For Sodap Watch Store (ID: 5), ensure we always have the correct wallet address
      const selectedStoreId = sessionStorage.getItem("selectedStoreId");
      if (selectedStoreId === "5" && !storeWalletAddress) {
        // Use our updated wallet address for Sodap Watch Store if missing
        const watchStoreWallet = WALLET_CONFIG.STORE_MANAGER;
        setStoreWalletAddress(watchStoreWallet);
        console.log("Using store manager wallet:", watchStoreWallet);
      }

      try {
        // 🔧 FIX: Prioritize connected wallet over hardcoded wallet
        let payerWalletAddress: string;

        if (walletAddress) {
          // Use the actually connected wallet (highest priority)
          payerWalletAddress = walletAddress;
          console.log("💳 Using connected wallet:", payerWalletAddress);
        } else if (userWallet) {
          // Fallback to hardcoded user wallet (for testing scenarios like Batur)
          payerWalletAddress = userWallet;
          console.log("🧪 Using test wallet:", payerWalletAddress);
        } else {
          throw new Error(
            "No wallet available for payment. Please connect your wallet."
          );
        }

        // Convert the wallet and store addresses to PublicKeys
        const fromWalletPublicKey = new PublicKey(payerWalletAddress);
        const toStorePublicKey = new PublicKey(storeWalletAddress);

        console.log("Creating SOL transfer transaction");
        console.log(`Payment Method: ${paymentSelection.method}`);
        console.log(`Amount: ${paymentAmount} SOL`);
        console.log(`From: ${fromWalletPublicKey.toString()}`);
        console.log(`To: ${toStorePublicKey.toString()}`);

        // Calculate amount in lamports (1 SOL = 1,000,000,000 lamports)
        const lamports = Math.round(paymentAmount * LAMPORTS_PER_SOL);
        console.log(`Amount in lamports: ${lamports}`);

        // Create a simple transfer transaction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: fromWalletPublicKey,
            toPubkey: toStorePublicKey,
            lamports: lamports,
          })
        );

        // Get a recent blockhash
        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromWalletPublicKey;

        // Send transaction using wallet adapter
        if (!program?.provider.wallet) {
          throw new Error("Wallet not connected");
        }

        toast.info("Please approve the transaction in your wallet");

        // Request signature from the user using wallet adapter
        const signedTransaction = await program.provider.wallet.signTransaction(
          transaction
        );

        // Send the transaction to the network
        toast.info("Sending transaction to Solana network...");
        const signature = await connection.sendRawTransaction(
          signedTransaction.serialize()
        );

        // Wait for confirmation
        toast.info("Waiting for transaction confirmation...");
        const confirmation = await connection.confirmTransaction(
          signature,
          "confirmed"
        );

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        // Set the transaction signature for display
        setTransactionSignature(signature);

        // Show success message with explorer link
        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
        const successMessage =
          paymentSelection.method === "direct"
            ? "Payment successful!"
            : `BNPL downpayment successful! ${
                totalAmount - paymentAmount
              } SOL remaining in ${
                paymentSelection.bnplTerm
              } monthly payments.`;

        toast.success(
          <div>
            {successMessage}
            <br />
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-500"
            >
              View transaction on Solana Explorer
            </a>
          </div>,
          { duration: 10000 }
        );

        // Get the store name from session storage
        const storeName = sessionStorage.getItem("selectedStoreName");

        // If store name is missing, log a warning and save it to localStorage for debugging
        if (!storeName) {
          console.warn(
            'Store name not found in sessionStorage. This will cause "Unknown Store" to appear in purchase history.'
          );
          console.log(
            "Available in sessionStorage:",
            Object.keys(sessionStorage)
          );
        } else {
          // Save the store name to localStorage for future reference
          localStorage.setItem("sodap-selected-store-name", storeName);
        }

        // Create purchase data with proper store name and payment method info
        const purchase = {
          id: signature,
          transactionSignature: signature,
          date: new Date().toISOString(),
          storeName:
            storeName ||
            localStorage.getItem("sodap-selected-store-name") ||
            "Sodap Store",
          items: cartItems.map((item) => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
          })),
          receiptAddress: signature,
          storeAddress: storeWalletAddress,
          buyerAddress: payerWalletAddress,
          purchaseTimestamp: Math.floor(Date.now() / 1000),
          totalAmount: totalAmount,
          paidAmount: paymentAmount,
          paymentMethod: paymentSelection.method,
          bnplTerm: paymentSelection.bnplTerm,
          bnplStatus: paymentSelection.method === "bnpl" ? "active" : undefined,
          remainingAmount:
            paymentSelection.method === "bnpl"
              ? (paymentSelection.finalPaymentAmount || totalAmount) - paymentAmount
              : 0,
          // Points redemption information
          pointsRedeemed: pointsRedeemed,
          pointsValue: pointsValue,
          originalAmount: totalAmount, // Store original amount before points discount
        };

        // Add purchase to history - this will handle saving to localStorage
        await addPurchase(purchase);

        // Handle points redemption and loyalty points after successful payment
        console.log("🎁 Starting loyalty points process...");
        console.log("💰 Payment amount:", paymentAmount, "SOL");

        try {
          const existingLoyalty = localStorage.getItem(
            "sodap-loyalty-earnings"
          );
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

          // Handle points redemption first (if any)
          if (pointsRedeemed > 0) {
            console.log(`🎯 Processing points redemption: ${pointsRedeemed} points (${pointsValue} SOL)`);
            
            const redemptionEntry = {
              id: `redemption_${Date.now()}`,
              date: new Date().toISOString().split("T")[0],
              type: "Points Redemption",
              store: storeName || "Sodap Watch Store",
              points: -pointsRedeemed, // Negative to indicate redemption
              description: `Redeemed ${pointsRedeemed} points for ${pointsValue} SOL discount`,
              transactionSignature: signature,
            };
            
            loyaltyEarnings.unshift(redemptionEntry);
            console.log("✅ Points redemption recorded:", redemptionEntry);
          }

          // Award loyalty points for the payment made (after points redemption)
          const loyaltyPointsEarned = Math.floor(paymentAmount * 10); // 10 points per SOL
          console.log("🎯 Loyalty points to award:", loyaltyPointsEarned);

          const newLoyaltyEntry = {
            id: `purchase_${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            type: "Purchase",
            store: storeName || "Sodap Watch Store",
            points: loyaltyPointsEarned,
            description: `Purchase payment for ${paymentAmount} SOL`,
            transactionSignature: signature,
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

          // Update the success message to include loyalty points
          const loyaltyMessage = `🎉 Payment successful! Earned ${loyaltyPointsEarned} loyalty points!`;
          toast.success(loyaltyMessage, { duration: 5000 });
        } catch (loyaltyError) {
          console.warn("Failed to award loyalty points:", loyaltyError);
        }

        // Also save the last purchase separately for easy access during refunds
        localStorage.setItem("sodap-last-purchase", JSON.stringify(purchase));

        // Log that purchase was saved
        console.log("Purchase saved successfully:", purchase.id);

        // Note: We've removed the automatic return request creation.
        // Returns should now be initiated by the user through the UI.

        // Show success dialog
        setShowSuccessDialog(true);
      } catch (err: unknown) {
        console.error("Payment error:", err);
        let errorMessage = "Payment failed: Unknown error";

        if (err instanceof Error) {
          const errorMap = {
            "Invalid wallet address":
              "Invalid wallet address format. Please reconnect your wallet.",
            "User rejected":
              "Transaction was rejected. Please try again and approve the transaction.",
            "was not approved":
              "Transaction was rejected. Please try again and approve the transaction.",
            "insufficient funds":
              "Insufficient funds in your wallet to complete this transaction. You can get free SOL from the Solana Devnet faucet.",
            "insufficient lamports":
              "Insufficient funds in your wallet to complete this transaction. You can get free SOL from the Solana Devnet faucet.",
            "Cannot read properties of undefined":
              "Wallet connection error. Please reconnect your wallet and try again.",
            "wallet not connected":
              "Wallet connection error. Please reconnect your wallet and try again.",
            "Failed to create purchase instruction":
              "Transaction failed: The store program doesn't support this transaction type.",
            AccountNotFound:
              "The store account does not exist on Devnet. Please make sure the store is properly initialized.",
            "Account does not exist":
              "The store account does not exist on Devnet. Please make sure the store is properly initialized.",
            "custom program error":
              "Smart contract error. This could be due to incorrect program ID or the store not being properly initialized.",
          };

          // Find the first matching error message
          const matchedError = Object.entries(errorMap).find(([key]) =>
            err.message.includes(key)
          );
          if (matchedError) {
            errorMessage = matchedError[1];

            // Special handling for insufficient funds
            if (
              err.message.includes("insufficient funds") ||
              err.message.includes("insufficient lamports")
            ) {
              toast.error(
                <div>
                  {errorMessage}
                  <br />
                  <a
                    href="https://solfaucet.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-500 mt-2 inline-block"
                  >
                    Get free Devnet SOL
                  </a>
                </div>,
                { duration: 10000 }
              );
              return; // Early return to avoid double toast
            }
          } else {
            errorMessage = `Payment failed: ${err.message}`;
          }
        }

        toast.error(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    } catch (err: unknown) {
      console.error("Payment error:", err);
      let errorMessage = "Payment failed: Unknown error";

      if (err instanceof Error) {
        const errorMap = {
          "Invalid wallet address":
            "Invalid wallet address format. Please reconnect your wallet.",
          "User rejected":
            "Transaction was rejected. Please try again and approve the transaction.",
          "was not approved":
            "Transaction was rejected. Please try again and approve the transaction.",
          "insufficient funds":
            "Insufficient funds in your wallet to complete this transaction. You can get free SOL from the Solana Devnet faucet.",
          "insufficient lamports":
            "Insufficient funds in your wallet to complete this transaction. You can get free SOL from the Solana Devnet faucet.",
          "Cannot read properties of undefined":
            "Wallet connection error. Please reconnect your wallet and try again.",
          "wallet not connected":
            "Wallet connection error. Please reconnect your wallet and try again.",
          "Failed to create purchase instruction":
            "Transaction failed: The store program doesn't support this transaction type.",
          AccountNotFound:
            "The store account does not exist on Devnet. Please make sure the store is properly initialized.",
          "Account does not exist":
            "The store account does not exist on Devnet. Please make sure the store is properly initialized.",
          "custom program error":
            "Smart contract error. This could be due to incorrect program ID or the store not being properly initialized.",
        };

        // Find the first matching error message
        const matchedError = Object.entries(errorMap).find(([key]) =>
          err.message.includes(key)
        );
        if (matchedError) {
          errorMessage = matchedError[1];

          // Special handling for insufficient funds
          if (
            err.message.includes("insufficient funds") ||
            err.message.includes("insufficient lamports")
          ) {
            toast.error(
              <div>
                {errorMessage}
                <br />
                <a
                  href="https://solfaucet.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-500 mt-2 inline-block"
                >
                  Get free Devnet SOL
                </a>
              </div>,
              { duration: 10000 }
            );
            return; // Early return to avoid double toast
          }
        } else {
          errorMessage = `Payment failed: ${err.message}`;
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSuccessDialog = (): void => {
    // Clear cart using the clearCart function
    clearCart();

    setShowSuccessDialog(false);
    // Navigate to store selection page instead of cart
    navigate("/store-selection");
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Complete Your Payment
      </h1>

      {/* Wallet Connection Status */}
      {!walletAddress && !isLoading && (
        <div className="mb-6 p-4 border-2 border-orange-200 bg-orange-50 rounded-lg">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-orange-800 mb-2">
              🔗 Connect Your Wallet
            </h2>
            <p className="text-orange-700 mb-4">
              Please connect your Phantom wallet to proceed with payment
            </p>
            <Button
              onClick={handleConnectWallet}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2"
              disabled={isProcessing}
            >
              Connect Phantom Wallet
            </Button>
          </div>
        </div>
      )}

      {walletAddress && (
        <div className="mb-4 p-3 border border-green-200 bg-green-50 rounded-lg">
          <div className="text-center">
            <p className="text-green-800 font-medium">
              ✅ Wallet Connected: {walletAddress.substring(0, 8)}...
              {walletAddress.substring(walletAddress.length - 8)}
            </p>
          </div>
        </div>
      )}

      <PaymentDetailsCard
        cartTotal={cartTotal}
        walletAddress={walletAddress}
        isConnecting={isLoading}
        isProcessing={isProcessing}
        onConnectWallet={handleConnectWallet}
        onPayment={handlePayment}
      />

      <div className="mt-4 text-center">
        <Button
          variant="ghost"
          onClick={() => navigate("/cart")}
          disabled={isProcessing}
        >
          Back to Cart
        </Button>
      </div>

      <PaymentMethodDialog
        open={showPaymentMethodDialog}
        onOpenChange={setShowPaymentMethodDialog}
        onPaymentMethodSelect={handlePaymentMethodSelect}
        cartTotal={cartTotal}
      />

      <PaymentSuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        onContinue={handleCloseSuccessDialog}
        transactionSignature={transactionSignature}
      />

      {/* Debug info - only visible in development mode */}
      {import.meta.env.DEV && (
        <div className="mt-8 border border-gray-300 rounded-md p-4 bg-gray-50 text-xs">
          <h3 className="font-semibold mb-2">Devnet Transaction Details:</h3>
          <div className="space-y-1">
            <p>
              <strong>Store ID:</strong> {storeId}
            </p>
            <p>
              <strong>User Wallet:</strong>{" "}
              {walletAddress ? (
                <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                  {walletAddress} (Connected Wallet) ✅
                </span>
              ) : sessionStorage.getItem("username") === "Batur" ? (
                <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded">
                  {sessionStorage.getItem("userWallet")} (Test: Batur)
                </span>
              ) : (
                <span className="text-gray-500">Not connected</span>
              )}
            </p>
            <p>
              <strong>Store Wallet:</strong>{" "}
              <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded">
                {storeWalletAddress || "Not available"} (Store Owner)
              </span>
            </p>
            {/* Wallet validation */}
            {(walletAddress || sessionStorage.getItem("userWallet")) ===
              storeWalletAddress && (
              <p className="text-red-600 bg-red-50 px-2 py-1 rounded font-semibold">
                ⚠️ WARNING: User and Store wallets are the same!
              </p>
            )}
            {storePda && (
              <p>
                <strong>Store PDA:</strong> {storePda}
              </p>
            )}
            <p>
              <strong>Amount:</strong> {cartTotal} SOL
            </p>
            {transactionSignature && (
              <p>
                <strong>Signature:</strong>{" "}
                {transactionSignature.substring(0, 8)}...
                {transactionSignature.substring(
                  transactionSignature.length - 8
                )}
                <a
                  href={`https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline text-blue-500"
                >
                  View on Explorer
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper component that provides the Profile context
const Payment: React.FC = (): React.ReactElement => {
  return (
    <Layout role="end_user">
      <ProfileProvider>
        <PaymentContent />
      </ProfileProvider>
    </Layout>
  );
};

export default Payment;
