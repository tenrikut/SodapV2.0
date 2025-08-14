import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAnchor } from "@/hooks/useAnchor";
import { usePurchaseHistory } from "@/hooks/usePurchaseHistory";
import { useBnplPayment } from "@/hooks/useBnplPayment";
import { toast } from "sonner";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

interface BnplLoan {
  id: string;
  transactionSignature: string;
  latestTransactionSignature?: string; // Latest payment transaction signature
  storeName: string;
  totalAmount: number;
  downpayment: number;
  remainingAmount: number;
  termMonths: number;
  monthlyPayment: number;
  paidPayments: number;
  nextPaymentDate: string;
  status: "active" | "completed" | "overdue" | "defaulted";
  createdDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface BnplTabProps {
  isAdmin?: boolean;
}

const BnplTab: React.FC<BnplTabProps> = ({ isAdmin = false }) => {
  const { walletAddress, connection } = useAnchor(); // Use wallet from Anchor context
  const { purchases } = usePurchaseHistory();
  const { makeBnplPayment } = useBnplPayment();
  const [bnplLoans, setBnplLoans] = useState<BnplLoan[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [monthlyPayments, setMonthlyPayments] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [payingOffLoans, setPayingOffLoans] = useState<Set<string>>(new Set());
  const [makingPayments, setMakingPayments] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log("BnplTab - Wallet Address:", walletAddress);
    console.log("BnplTab - Total Purchases:", purchases.length);

    // Load completed loan IDs from localStorage
    const getCompletedLoanIds = (): Set<string> => {
      try {
        const stored = localStorage.getItem("sodap-completed-bnpl-loans");
        if (stored) {
          return new Set(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Error loading completed loan IDs:", error);
      }
      return new Set();
    };

    const completedLoanIds = getCompletedLoanIds();
    console.log("Completed loan IDs loaded:", Array.from(completedLoanIds));

    // Load payment progress from localStorage
    const getPaymentProgress = (): Record<
      string,
      {
        paidPayments: number;
        remainingAmount: number;
        nextPaymentDate: string;
        latestTransactionSignature?: string;
      }
    > => {
      try {
        const stored = localStorage.getItem("sodap-bnpl-payment-progress");
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.error("Error loading payment progress:", error);
      }
      return {};
    };

    const paymentProgress = getPaymentProgress();
    console.log("Payment progress loaded:", paymentProgress);

    // Extract BNPL purchases and convert them to loan objects
    const bnplPurchases = purchases.filter(
      (purchase) => purchase.paymentMethod === "bnpl"
    );

    console.log("BnplTab - BNPL Purchases found:", bnplPurchases.length);

    const loans: BnplLoan[] = bnplPurchases.map((purchase) => {
      const termMonths = parseInt(purchase.bnplTerm || "3");
      const originalRemainingAmount = purchase.remainingAmount || 0;
      const monthlyPayment = originalRemainingAmount / termMonths;

      // Check if this loan has been completed
      const isCompleted = completedLoanIds.has(purchase.id);

      // Check if there's stored payment progress for this loan
      const progress = paymentProgress[purchase.id];

      // Determine the actual values based on completion status and stored progress
      let paidPayments: number;
      let actualRemainingAmount: number;
      let nextPaymentDate: string;

      if (isCompleted) {
        // Loan is completed
        paidPayments = termMonths;
        actualRemainingAmount = 0;
        nextPaymentDate = "Completed";
      } else if (progress) {
        // Use stored progress
        paidPayments = progress.paidPayments;
        actualRemainingAmount = progress.remainingAmount;
        nextPaymentDate = progress.nextPaymentDate;
      } else {
        // Use original values (no payments made yet)
        paidPayments = 0;
        actualRemainingAmount = originalRemainingAmount;

        // Calculate next payment date (1 month from creation)
        const createdDate = new Date(purchase.date);
        const nextPaymentDateObj = new Date(createdDate);
        nextPaymentDateObj.setMonth(nextPaymentDateObj.getMonth() + 1);
        nextPaymentDate = nextPaymentDateObj.toISOString().split("T")[0];
      }

      return {
        id: purchase.id,
        transactionSignature: purchase.transactionSignature,
        latestTransactionSignature: progress?.latestTransactionSignature,
        storeName: purchase.storeName,
        totalAmount: purchase.totalAmount,
        downpayment: purchase.paidAmount,
        remainingAmount: actualRemainingAmount,
        termMonths: termMonths,
        monthlyPayment: monthlyPayment,
        paidPayments: paidPayments,
        nextPaymentDate: nextPaymentDate,
        status: isCompleted ? ("completed" as const) : ("active" as const),
        createdDate: purchase.date,
        items: purchase.items,
      };
    });

    setBnplLoans(loans);
  }, [purchases]);

  // Calculate totals whenever bnplLoans change (including after payment completion)
  useEffect(() => {
    const activeLoans = bnplLoans.filter((loan) => loan.status === "active");

    const totalRemaining = activeLoans.reduce(
      (sum, loan) => sum + loan.remainingAmount,
      0
    );
    const totalMonthly = activeLoans.reduce(
      (sum, loan) => sum + loan.monthlyPayment,
      0
    );

    setTotalOwed(totalRemaining);
    setMonthlyPayments(totalMonthly);

    console.log("BNPL Summary updated:", {
      activeLoans: activeLoans.length,
      totalRemaining,
      totalMonthly,
    });
  }, [bnplLoans]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!walletAddress || !connection) return;

      try {
        const balance = await connection.getBalance(
          new PublicKey(walletAddress)
        );
        setWalletBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
      }
    };

    fetchWalletBalance();
  }, [walletAddress, connection]);

  const handlePayAllNow = async (loan: BnplLoan) => {
    if (!walletAddress || !connection) {
      toast.error("Wallet not connected");
      return;
    }

    if (walletBalance < loan.remainingAmount) {
      toast.error(
        `Insufficient balance. You need ${loan.remainingAmount.toFixed(
          3
        )} SOL but only have ${walletBalance.toFixed(3)} SOL`
      );
      return;
    }

    setPayingOffLoans((prev) => new Set(prev).add(loan.id));

    try {
      toast.info("Processing remaining BNPL payments...");
      console.log("Starting BNPL payoff for loan:", loan);

      // Pay off the entire remaining balance in one transaction
      console.log(
        `Paying off remaining balance of ${loan.remainingAmount} SOL for loan ${loan.id}`
      );

      let lastTransactionSignature: string | undefined;

      try {
        console.log(`Making single payment for full remaining balance`);

        // Get store information for this loan
        const storeInfo = getStoreInfo(loan);

        const result = await makeBnplPayment(
          loan.id,
          storeInfo.publicKey,
          storeInfo.ownerKey,
          loan.remainingAmount // Pay the full remaining balance in one transaction
        );

        console.log(`Full payoff result:`, result);

        // Track the transaction signature
        if (result.transactionSignature) {
          lastTransactionSignature = result.transactionSignature;
        }

        toast.success(
          "🎉 BNPL loan paid off completely! Loyalty points awarded!"
        );
      } catch (paymentError) {
        console.error(`Error in full payoff:`, paymentError);
        toast.error(
          `Payment failed: ${
            paymentError instanceof Error
              ? paymentError.message
              : "Unknown error"
          }`
        );

        // Show detailed error for debugging
        if (
          paymentError instanceof Error &&
          paymentError.message.includes("Program not initialized")
        ) {
          toast.error(
            "Please connect your wallet properly to use BNPL payments"
          );
        }
        throw paymentError; // Re-throw to stop execution
      }

      // Update the loan status locally to completed
      setBnplLoans((prevLoans) =>
        prevLoans.map((l) => {
          if (l.id === loan.id) {
            return {
              ...l,
              status: "completed" as const,
              remainingAmount: 0,
              paidPayments: l.termMonths,
              latestTransactionSignature: lastTransactionSignature,
            };
          }
          return l;
        })
      );

      // Persist loan completion to localStorage
      const saveCompletedLoan = (loanId: string) => {
        try {
          const stored = localStorage.getItem("sodap-completed-bnpl-loans");
          let completedIds: string[] = [];
          if (stored) {
            completedIds = JSON.parse(stored);
          }
          if (!completedIds.includes(loanId)) {
            completedIds.push(loanId);
            localStorage.setItem(
              "sodap-completed-bnpl-loans",
              JSON.stringify(completedIds)
            );
            console.log("✅ Saved completed loan ID:", loanId);
          }
        } catch (error) {
          console.error("Error saving completed loan ID:", error);
        }
      };

      saveCompletedLoan(loan.id);

      // Award bonus loyalty points for completing the entire BNPL loan
      try {
        console.log(
          "🎉 BNPL loan completed! Adding completion bonus loyalty points..."
        );

        // Calculate completion bonus: 2 points per SOL
        const completionBonusPoints = Math.floor(loan.totalAmount * 2);

        // Calculate early completion bonus if paid off before final month
        const monthsEarly = Math.max(0, loan.termMonths - loan.paidPayments);
        const earlyCompletionBonusPoints =
          monthsEarly > 0 ? Math.floor(loan.totalAmount * monthsEarly) : 0; // 1 point per SOL per month early

        const totalBonusPoints =
          completionBonusPoints + earlyCompletionBonusPoints;

        console.log("🎯 BNPL completion bonus points:", completionBonusPoints);
        console.log(
          "⚡ BNPL early completion bonus:",
          earlyCompletionBonusPoints,
          "for",
          monthsEarly,
          "months early"
        );
        console.log("🏆 Total bonus points:", totalBonusPoints);

        const existingLoyalty = localStorage.getItem("sodap-loyalty-earnings");
        let loyaltyEarnings = [];
        if (existingLoyalty) {
          try {
            loyaltyEarnings = JSON.parse(existingLoyalty);
          } catch (e) {
            console.error("Error parsing loyalty earnings:", e);
          }
        }

        const bonusDescription =
          monthsEarly > 0
            ? `Completion bonus (${completionBonusPoints} pts) + Early bonus (${earlyCompletionBonusPoints} pts, ${monthsEarly} months early) for ${loan.totalAmount} SOL BNPL loan`
            : `Completion bonus for ${loan.totalAmount} SOL BNPL loan`;

        const bonusLoyaltyEntry = {
          id: `bnpl_completion_bonus_${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          type:
            monthsEarly > 0
              ? "BNPL Early Completion Bonus"
              : "BNPL Completion Bonus",
          store: loan.storeName || "Sodap Watch Store",
          points: totalBonusPoints,
          description: bonusDescription,
          transactionSignature: lastTransactionSignature,
        };

        console.log("📝 New BNPL completion bonus entry:", bonusLoyaltyEntry);

        loyaltyEarnings.unshift(bonusLoyaltyEntry);
        localStorage.setItem(
          "sodap-loyalty-earnings",
          JSON.stringify(loyaltyEarnings)
        );

        console.log("✅ Added BNPL completion bonus points:", totalBonusPoints);

        // Dispatch event to notify other components
        window.dispatchEvent(
          new CustomEvent("sodap-loyalty-updated", {
            detail: { points: totalBonusPoints },
          })
        );

        const successMessage =
          monthsEarly > 0
            ? `🎉 BNPL loan completed ${monthsEarly} months early! Earned ${totalBonusPoints} bonus loyalty points!`
            : `🎉 BNPL loan completed! Earned ${totalBonusPoints} bonus loyalty points!`;

        toast.success(successMessage);
      } catch (loyaltyError) {
        console.warn("Failed to award BNPL completion bonus:", loyaltyError);
      }

      // Refresh wallet balance after payments
      const newBalance = await connection.getBalance(
        new PublicKey(walletAddress)
      );
      setWalletBalance(newBalance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Error paying off loan:", error);

      // More detailed error reporting
      if (error instanceof Error) {
        toast.error(`Payment failed: ${error.message}`);
      } else {
        toast.error("Failed to process payment. Please try again.");
      }
    } finally {
      setPayingOffLoans((prev) => {
        const newSet = new Set(prev);
        newSet.delete(loan.id);
        return newSet;
      });
    }
  };

  const handleMakePayment = async (loan: BnplLoan) => {
    if (!walletAddress || !connection) {
      toast.error("Wallet not connected");
      return;
    }

    const monthlyPaymentAmount = loan.monthlyPayment;

    if (walletBalance < monthlyPaymentAmount) {
      toast.error(
        `Insufficient balance. You need ${monthlyPaymentAmount.toFixed(
          3
        )} SOL but only have ${walletBalance.toFixed(3)} SOL`
      );
      return;
    }

    setMakingPayments((prev) => new Set(prev).add(loan.id));

    try {
      toast.info(
        `Processing monthly payment of ${formatCurrency(
          monthlyPaymentAmount
        )}...`
      );
      console.log("Making monthly BNPL payment for loan:", loan);

      // Get store info for this loan
      const storeInfo = getStoreInfo(loan);

      // Make a single monthly payment
      const paymentResult = await makeBnplPayment(
        loan.id,
        storeInfo.publicKey,
        storeInfo.ownerKey,
        monthlyPaymentAmount // Use monthly payment amount instead of total
      );

      if (paymentResult) {
        console.log("✅ Monthly payment successful:", paymentResult);

        // Calculate new values after payment
        const newPaidPayments = loan.paidPayments + 1;
        const newRemainingAmount = Math.max(
          0,
          loan.remainingAmount - monthlyPaymentAmount
        );
        const newNextPaymentDate = getNextPaymentDate(loan.nextPaymentDate);
        const isLoanCompleted = newPaidPayments >= loan.termMonths;

        // Update the loan locally to reflect the payment
        setBnplLoans((prevLoans) =>
          prevLoans.map((l) =>
            l.id === loan.id
              ? {
                  ...l,
                  paidPayments: newPaidPayments,
                  remainingAmount: newRemainingAmount,
                  status: isLoanCompleted
                    ? ("completed" as const)
                    : ("active" as const),
                  nextPaymentDate: newNextPaymentDate,
                  latestTransactionSignature:
                    paymentResult.transactionSignature, // Update latest transaction
                }
              : l
          )
        );

        // Save payment progress to localStorage (unless loan is completed)
        if (!isLoanCompleted) {
          savePaymentProgress(
            loan.id,
            newPaidPayments,
            newRemainingAmount,
            newNextPaymentDate,
            paymentResult.transactionSignature // Save latest transaction signature
          );
        }

        // If this was the final payment, save completion status
        if (isLoanCompleted) {
          const saveCompletedLoan = (loanId: string) => {
            try {
              const stored = localStorage.getItem("sodap-completed-bnpl-loans");
              let completedIds: string[] = [];
              if (stored) {
                completedIds = JSON.parse(stored);
              }
              if (!completedIds.includes(loanId)) {
                completedIds.push(loanId);
                localStorage.setItem(
                  "sodap-completed-bnpl-loans",
                  JSON.stringify(completedIds)
                );
                console.log("✅ Loan completed with final payment:", loanId);
              }
            } catch (error) {
              console.error("Error saving completed loan ID:", error);
            }
          };

          saveCompletedLoan(loan.id);

          // Award bonus loyalty points for completing the entire BNPL loan with final payment
          try {
            console.log(
              "🎉 BNPL loan completed with final payment! Adding completion bonus loyalty points..."
            );

            // Calculate completion bonus: 2 points per SOL
            const completionBonusPoints = Math.floor(loan.totalAmount * 2);

            // For final payment completion, no early bonus (completed on schedule)
            const monthsEarly = 0; // This is the final scheduled payment
            const earlyCompletionBonusPoints = 0;
            const totalBonusPoints = completionBonusPoints;

            console.log(
              "🎯 BNPL completion bonus points:",
              completionBonusPoints
            );
            console.log(
              "📅 Completed on schedule (final payment) - no early bonus"
            );

            const existingLoyalty = localStorage.getItem(
              "sodap-loyalty-earnings"
            );
            let loyaltyEarnings = [];
            if (existingLoyalty) {
              try {
                loyaltyEarnings = JSON.parse(existingLoyalty);
              } catch (e) {
                console.error("Error parsing loyalty earnings:", e);
              }
            }

            const bonusLoyaltyEntry = {
              id: `bnpl_completion_bonus_${Date.now()}`,
              date: new Date().toISOString().split("T")[0],
              type: "BNPL Completion Bonus",
              store: loan.storeName || "Sodap Watch Store",
              points: totalBonusPoints,
              description: `Completion bonus for ${loan.totalAmount} SOL BNPL loan`,
              transactionSignature: paymentResult.transactionSignature,
            };

            console.log(
              "📝 New BNPL completion bonus entry:",
              bonusLoyaltyEntry
            );

            loyaltyEarnings.unshift(bonusLoyaltyEntry);
            localStorage.setItem(
              "sodap-loyalty-earnings",
              JSON.stringify(loyaltyEarnings)
            );

            console.log(
              "✅ Added BNPL completion bonus points:",
              totalBonusPoints
            );

            // Dispatch event to notify other components
            window.dispatchEvent(
              new CustomEvent("sodap-loyalty-updated", {
                detail: { points: totalBonusPoints },
              })
            );

            toast.success(
              `🎉 BNPL loan completed! Earned ${totalBonusPoints} bonus loyalty points!`
            );
          } catch (loyaltyError) {
            console.warn(
              "Failed to award BNPL completion bonus:",
              loyaltyError
            );
          }

          // Remove payment progress since loan is completed
          removePaymentProgress(loan.id);
        }

        // Refresh wallet balance after payment
        const newBalance = await connection.getBalance(
          new PublicKey(walletAddress)
        );
        setWalletBalance(newBalance / LAMPORTS_PER_SOL);

        toast.success(
          `✅ Monthly payment of ${formatCurrency(
            monthlyPaymentAmount
          )} processed successfully!`
        );
      }
    } catch (error) {
      console.error("Error making monthly payment:", error);

      if (error instanceof Error) {
        toast.error(`Payment failed: ${error.message}`);
      } else {
        toast.error("Failed to process monthly payment. Please try again.");
      }
    } finally {
      setMakingPayments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(loan.id);
        return newSet;
      });
    }
  };

  // Helper function to calculate next payment date (add 1 month)
  const getNextPaymentDate = (currentDate: string): string => {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split("T")[0];
  };

  // Helper function to save payment progress to localStorage
  const savePaymentProgress = (
    loanId: string,
    paidPayments: number,
    remainingAmount: number,
    nextPaymentDate: string,
    latestTransactionSignature?: string
  ) => {
    try {
      const stored = localStorage.getItem("sodap-bnpl-payment-progress");
      let progressData: Record<
        string,
        {
          paidPayments: number;
          remainingAmount: number;
          nextPaymentDate: string;
          latestTransactionSignature?: string;
        }
      > = {};

      if (stored) {
        progressData = JSON.parse(stored);
      }

      progressData[loanId] = {
        paidPayments,
        remainingAmount,
        nextPaymentDate,
        ...(latestTransactionSignature && { latestTransactionSignature }),
      };

      localStorage.setItem(
        "sodap-bnpl-payment-progress",
        JSON.stringify(progressData)
      );
      console.log("✅ Saved payment progress for loan:", loanId, {
        paidPayments,
        remainingAmount,
        nextPaymentDate,
        latestTransactionSignature,
      });
    } catch (error) {
      console.error("Error saving payment progress:", error);
    }
  };

  // Helper function to remove payment progress when loan is completed
  const removePaymentProgress = (loanId: string) => {
    try {
      const stored = localStorage.getItem("sodap-bnpl-payment-progress");
      if (stored) {
        const progressData = JSON.parse(stored);
        delete progressData[loanId];
        localStorage.setItem(
          "sodap-bnpl-payment-progress",
          JSON.stringify(progressData)
        );
        console.log("✅ Removed payment progress for completed loan:", loanId);
      }
    } catch (error) {
      console.error("Error removing payment progress:", error);
    }
  };

  const canPayOff = (loan: BnplLoan) => {
    return walletBalance >= loan.remainingAmount && loan.status === "active";
  };

  // Helper function to check transaction on Solana Explorer
  const handleCheckTransaction = (loan: BnplLoan) => {
    console.log("🔍 Check Transaction Debug:", {
      loanId: loan.id,
      originalTransaction: loan.transactionSignature,
      latestTransaction: loan.latestTransactionSignature,
      paidPayments: loan.paidPayments,
      status: loan.status,
    });

    // Use latest payment transaction if available, otherwise fall back to original transaction
    const transactionToShow =
      loan.latestTransactionSignature || loan.transactionSignature;

    if (transactionToShow) {
      const explorerUrl = `https://explorer.solana.com/tx/${transactionToShow}?cluster=devnet`;
      window.open(explorerUrl, "_blank");

      // Show toast to indicate which transaction is being shown
      if (loan.latestTransactionSignature) {
        toast.info("✅ Opening latest payment transaction");
        console.log(
          "✅ Showing latest payment transaction:",
          loan.latestTransactionSignature
        );
      } else {
        toast.info("📄 Opening original purchase transaction");
        console.log(
          "📄 Showing original purchase transaction:",
          loan.transactionSignature
        );
      }
    } else {
      toast.info("No transaction signature available for this loan");
      console.error("❌ No transaction signature found for loan:", loan.id);
    }
  };

  const getStoreInfo = (loan: BnplLoan) => {
    // Map store names to their wallet addresses
    // In a real implementation, this would come from a store registry or the loan data
    const storeMapping = {
      "Sodap Watch Store": {
        publicKey: "DfhzrfdE5VDk43iP1NL8MLS5xFaxquxJVFtjhjRmHLAW",
        ownerKey: "DfhzrfdE5VDk43iP1NL8MLS5xFaxquxJVFtjhjRmHLAW",
      },
      "Electronics Emporium": {
        publicKey: "7kZqKGLK8QaZ6KGLMZqKGL8QaZ6KGLMZQZ6KGLMZqKGL",
        ownerKey: "7kZqKGLK8QaZ6KGLMZqKGL8QaZ6KGLMZQZ6KGLMZqKGL",
      },
      "Fashion Forward": {
        publicKey: "8mPrLHM9RbP7LHMNArLHM9RbP7LHMNARP7LHMNArLHM9",
        ownerKey: "8mPrLHM9RbP7LHMNArLHM9RbP7LHMNARP7LHMNArLHM9",
      },
    };

    return storeMapping[loan.storeName] || storeMapping["Sodap Watch Store"]; // Default fallback
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      case "defaulted":
        return <Badge className="bg-gray-100 text-gray-800">Defaulted</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getPaymentProgress = (loan: BnplLoan) => {
    return (loan.paidPayments / loan.termMonths) * 100;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(3)} SOL`;
  };

  // Helper function to reset completed loans for testing (can be removed in production)
  const resetCompletedLoans = () => {
    localStorage.removeItem("sodap-completed-bnpl-loans");
    console.log(
      "🔄 Reset completed loans - refresh page to see active loans again"
    );
    window.location.reload();
  };

  // Check for wallet connection from multiple sources
  const connectedWallet =
    walletAddress ||
    sessionStorage.getItem("walletAddress") ||
    sessionStorage.getItem("userWallet");

  if (!connectedWallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My BNPL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">
              Please connect your wallet to view BNPL loans
            </p>
            <div className="mt-4 text-xs text-gray-400">
              Debug: Wallet={walletAddress || "null"}, Session=
              {sessionStorage.getItem("walletAddress") || "null"}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bnplLoans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My BNPL</CardTitle>
          <p className="text-gray-500">
            Track your Buy Now, Pay Later purchases and payment schedules
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No BNPL Loans</h3>
            <p className="text-gray-500 mb-4">
              You haven't made any Buy Now, Pay Later purchases yet
            </p>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/store-selection")}
            >
              Start Shopping
            </Button>
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <div>Debug Info:</div>
              <div>Connected Wallet: {connectedWallet}</div>
              <div>Total Purchases: {purchases.length}</div>
              <div>
                BNPL Purchases:{" "}
                {purchases.filter((p) => p.paymentMethod === "bnpl").length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* BNPL Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            BNPL Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalOwed)}
              </div>
              <div className="text-sm text-gray-500">Total Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(monthlyPayments)}
              </div>
              <div className="text-sm text-gray-500">Monthly Payments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {bnplLoans.filter((loan) => loan.status === "active").length}
              </div>
              <div className="text-sm text-gray-500">Active Loans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(walletBalance)}
              </div>
              <div className="text-sm text-gray-500">Wallet Balance</div>
            </div>
          </div>

          {/* Pay All Outstanding Balance Button or No Active Loans Message */}
          {totalOwed > 0 ? (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Pay Off All Loans
                  </h4>
                  <p className="text-sm text-gray-600">
                    Pay your entire outstanding balance at once
                  </p>
                  {walletBalance < totalOwed && (
                    <p className="text-sm text-red-600 mt-1">
                      Insufficient balance. Need{" "}
                      {formatCurrency(totalOwed - walletBalance)} more SOL
                    </p>
                  )}
                </div>
                <Button
                  size="lg"
                  disabled={
                    walletBalance < totalOwed || payingOffLoans.size > 0
                  }
                  onClick={() => {
                    // Handle paying off all loans
                    bnplLoans
                      .filter((loan) => loan.status === "active")
                      .forEach((loan) => {
                        handlePayAllNow(loan);
                      });
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {payingOffLoans.size > 0
                    ? "Processing..."
                    : `Pay All ${formatCurrency(totalOwed)}`}
                </Button>
              </div>
            </div>
          ) : (
            bnplLoans.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="text-center">
                  <h4 className="font-medium text-green-800">
                    🎉 All BNPL Loans Completed!
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    You have successfully paid off all your Buy Now, Pay Later
                    loans.
                  </p>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Individual BNPL Loans */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your BNPL Loans</h3>
        {bnplLoans.map((loan) => (
          <Card key={loan.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{loan.storeName}</CardTitle>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(loan.createdDate).toLocaleDateString()}
                  </p>
                </div>
                {getStatusBadge(loan.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Loan Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Total Amount</div>
                  <div className="font-medium">
                    {formatCurrency(loan.totalAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Downpayment</div>
                  <div className="font-medium text-green-600">
                    {formatCurrency(loan.downpayment)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Remaining</div>
                  <div className="font-medium text-red-600">
                    {formatCurrency(loan.remainingAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Monthly Payment</div>
                  <div className="font-medium">
                    {formatCurrency(loan.monthlyPayment)}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Payment Progress</span>
                  <span className="text-sm text-gray-500">
                    {loan.paidPayments} of {loan.termMonths} payments
                  </span>
                </div>
                <Progress value={getPaymentProgress(loan)} className="h-2" />
              </div>

              {/* Next Payment or Completion Status */}
              {loan.status === "completed" ? (
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Loan Completed
                    </span>
                  </div>
                  <div className="text-sm text-green-700">
                    All payments completed successfully! 🎉
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Next Payment
                    </span>
                  </div>
                  <div className="text-sm text-blue-700">
                    {formatCurrency(loan.monthlyPayment)} due on{" "}
                    {new Date(loan.nextPaymentDate).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Purchased Items */}
              <div>
                <div className="text-sm font-medium mb-2">Purchased Items</div>
                <div className="space-y-1">
                  {loan.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm text-gray-600"
                    >
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {loan.status === "active" ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleMakePayment(loan)}
                      disabled={
                        walletBalance < loan.monthlyPayment ||
                        makingPayments.has(loan.id)
                      }
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      {makingPayments.has(loan.id)
                        ? "Processing..."
                        : `Make Payment (${formatCurrency(
                            loan.monthlyPayment
                          )})`}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePayAllNow(loan)}
                      disabled={!canPayOff(loan) || payingOffLoans.has(loan.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {payingOffLoans.has(loan.id) ? (
                        "Processing..."
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Pay All Now ({formatCurrency(loan.remainingAmount)})
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded-md text-sm">
                    ✅ Loan Paid Off
                  </div>
                )}

                {/* Common actions for all loans */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCheckTransaction(loan)}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Check Transaction
                </Button>
                <Button size="sm" variant="outline">
                  <Calendar className="h-4 w-4 mr-1" />
                  View Schedule
                </Button>
              </div>

              {/* Balance Warnings for Individual Loan */}
              {loan.status === "active" && (
                <>
                  {/* Warning for monthly payment */}
                  {walletBalance < loan.monthlyPayment && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Insufficient balance for monthly payment. Need{" "}
                      {formatCurrency(loan.monthlyPayment - walletBalance)} more
                      SOL.
                    </div>
                  )}
                  {/* Warning for full payment */}
                  {walletBalance >= loan.monthlyPayment && !canPayOff(loan) && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Insufficient balance to pay off this loan completely. You
                      need {formatCurrency(loan.remainingAmount)} SOL but have{" "}
                      {formatCurrency(walletBalance)} SOL.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BnplTab;
