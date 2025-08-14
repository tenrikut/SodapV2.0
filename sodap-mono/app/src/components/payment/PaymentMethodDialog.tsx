import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, Calendar, Info, Gift } from "lucide-react";

export interface PaymentMethodSelection {
  method: "direct" | "bnpl";
  bnplTerm?: "3" | "6" | "12";
  downpaymentAmount?: number;
  pointsToRedeem?: number;
  pointsRedemptionValue?: number; // SOL value of redeemed points
  finalPaymentAmount?: number; // Amount after points redemption
}

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentMethodSelect: (selection: PaymentMethodSelection) => void;
  cartTotal: string;
}

export const PaymentMethodDialog: React.FC<PaymentMethodDialogProps> = ({
  open,
  onOpenChange,
  onPaymentMethodSelect,
  cartTotal,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<"direct" | "bnpl">(
    "direct"
  );
  const [selectedTerm, setSelectedTerm] = useState<"3" | "6" | "12">("3");
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [availablePoints, setAvailablePoints] = useState(0);

  const totalAmount = parseFloat(cartTotal);
  const pointsToSolRate = 100; // 100 points = 1 SOL
  const maxRedeemablePoints = Math.min(availablePoints, Math.floor(totalAmount * pointsToSolRate));
  const pointsRedemptionValue = pointsToRedeem / pointsToSolRate;

  // Load available points from localStorage
  useEffect(() => {
    const loadAvailablePoints = () => {
      try {
        const stored = localStorage.getItem("sodap-loyalty-earnings");
        if (stored) {
          const earnings = JSON.parse(stored);
          const totalPoints = earnings.reduce((sum: number, earning: any) => sum + (earning.points || 0), 0);
          setAvailablePoints(Math.max(0, totalPoints));
        }
      } catch (error) {
        console.error("Error loading loyalty points:", error);
        setAvailablePoints(0);
      }
    };

    if (open) {
      loadAvailablePoints();
    }
  }, [open]);

  // Calculate BNPL details with points redemption
  const calculateBnplDetails = (term: "3" | "6" | "12") => {
    const months = parseInt(term);
    const downpaymentPercentage = 0.2; // 20% downpayment
    
    // Calculate amounts after points redemption
    const effectiveTotal = usePoints ? totalAmount - pointsRedemptionValue : totalAmount;
    const downpayment = effectiveTotal * downpaymentPercentage;
    const remainingAmount = effectiveTotal - downpayment;
    const monthlyPayment = remainingAmount / months;

    return {
      downpayment: downpayment.toFixed(3),
      monthlyPayment: monthlyPayment.toFixed(3),
      totalMonths: months,
      effectiveTotal: effectiveTotal.toFixed(3),
    };
  };

  const bnplDetails = calculateBnplDetails(selectedTerm);

  const handleProceed = () => {
    const baseSelection = {
      pointsToRedeem: usePoints ? pointsToRedeem : 0,
      pointsRedemptionValue: usePoints ? pointsRedemptionValue : 0,
      finalPaymentAmount: usePoints ? totalAmount - pointsRedemptionValue : totalAmount,
    };

    if (selectedMethod === "direct") {
      onPaymentMethodSelect({ 
        method: "direct",
        ...baseSelection,
      });
    } else {
      onPaymentMethodSelect({
        method: "bnpl",
        bnplTerm: selectedTerm,
        downpaymentAmount: parseFloat(bnplDetails.downpayment),
        ...baseSelection,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Choose Payment Method
          </DialogTitle>
          <DialogDescription>
            Select how you'd like to pay for your order of {cartTotal} SOL
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          <RadioGroup
            value={selectedMethod}
            onValueChange={(value: "direct" | "bnpl") =>
              setSelectedMethod(value)
            }
          >
            {/* Direct Payment Option */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedMethod === "direct" ? "ring-2 ring-sodap-purple" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="direct" id="direct" />
                  <Label htmlFor="direct" className="cursor-pointer">
                    <CardTitle className="text-lg">Pay Now</CardTitle>
                  </Label>
                </div>
                <CardDescription>
                  Pay the full amount immediately
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700">
                      Total Amount:
                    </span>
                    <span className="font-bold text-green-800">
                      {cartTotal} SOL
                    </span>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    ✓ No interest or additional fees
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BNPL Option */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedMethod === "bnpl" ? "ring-2 ring-sodap-purple" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bnpl" id="bnpl" />
                  <Label htmlFor="bnpl" className="cursor-pointer">
                    <CardTitle className="text-lg">
                      Buy Now, Pay Later
                    </CardTitle>
                  </Label>
                </div>
                <CardDescription>
                  Split your payment into installments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedMethod === "bnpl" && (
                  <div className="space-y-3">
                    <div>
                      <Label
                        htmlFor="term-select"
                        className="text-sm font-medium"
                      >
                        Payment Term
                      </Label>
                      <Select
                        value={selectedTerm}
                        onValueChange={(value: "3" | "6" | "12") =>
                          setSelectedTerm(value)
                        }
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue placeholder="Select payment term" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 months</SelectItem>
                          <SelectItem value="6">6 months</SelectItem>
                          <SelectItem value="12">12 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-md space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-700">
                          Downpayment (20%):
                        </span>
                        <span className="font-bold text-blue-800">
                          {bnplDetails.downpayment} SOL
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-700">
                          Monthly Payment:
                        </span>
                        <span className="font-medium text-blue-800">
                          {bnplDetails.monthlyPayment} SOL
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-700">Term:</span>
                        <span className="font-medium text-blue-800">
                          {bnplDetails.totalMonths} months
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-md">
                      <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-amber-700">
                        <div className="font-medium mb-1">BNPL Terms:</div>
                        <ul className="space-y-1">
                          <li>• 20% downpayment required today</li>
                          <li>
                            • Remaining amount split into{" "}
                            {bnplDetails.totalMonths} monthly payments
                          </li>
                          <li>• No interest charges</li>
                          <li>• Credit score may be checked</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMethod !== "bnpl" && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Pay in installments with flexible terms
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </RadioGroup>

          {/* Points Redemption Section */}
          {availablePoints > 0 && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-600" />
                  Use Loyalty Points
                </CardTitle>
                <CardDescription>
                  You have {availablePoints} points available (100 points = 1 SOL)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-points"
                    checked={usePoints}
                    onCheckedChange={(checked) => {
                      setUsePoints(!!checked);
                      if (!checked) {
                        setPointsToRedeem(0);
                      }
                    }}
                  />
                  <Label htmlFor="use-points" className="cursor-pointer">
                    Redeem loyalty points for this purchase
                  </Label>
                </div>

                {usePoints && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="points-input" className="text-sm font-medium">
                        Points to redeem (max: {maxRedeemablePoints})
                      </Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          id="points-input"
                          type="number"
                          min="0"
                          max={maxRedeemablePoints}
                          value={pointsToRedeem}
                          onChange={(e) => {
                            const value = Math.min(
                              maxRedeemablePoints,
                              Math.max(0, parseInt(e.target.value) || 0)
                            );
                            setPointsToRedeem(value);
                          }}
                          className="flex-1"
                          placeholder="Enter points to redeem"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPointsToRedeem(maxRedeemablePoints)}
                        >
                          Max
                        </Button>
                      </div>
                    </div>

                    {pointsToRedeem > 0 && (
                      <div className="bg-white p-3 rounded-md border">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Points to redeem:</span>
                            <span className="font-medium">{pointsToRedeem}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Points value:</span>
                            <span className="font-medium text-green-600">
                              -{pointsRedemptionValue.toFixed(3)} SOL
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span>Original total:</span>
                            <span>{totalAmount.toFixed(3)} SOL</span>
                          </div>
                          <div className="flex justify-between font-semibold text-purple-600">
                            <span>Final amount:</span>
                            <span>{(totalAmount - pointsRedemptionValue).toFixed(3)} SOL</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleProceed}
            className="bg-sodap-purple hover:bg-purple-700"
          >
            {selectedMethod === "direct"
              ? `Pay ${usePoints ? (totalAmount - pointsRedemptionValue).toFixed(3) : cartTotal} SOL Now`
              : `Pay ${bnplDetails.downpayment} SOL Today`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
