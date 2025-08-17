import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CartItem } from "@/components/cart/CartItem";
import type { CartItem as CartItemType } from "@/types/cart";
import { useCart } from "@/hooks/useCart";
import { useAnchor } from "@/hooks/useAnchor";
import { toast } from "sonner";
import { useSolPrice } from "../hooks/useSolPrice";
import { PriceConverter } from "@/types/pricing";
import { DollarSign, Coins } from "lucide-react";

// Create a component that uses the profile context
const CartContent: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, setCartItems, updateQuantity, removeItem } = useCart();
  const { walletAddress } = useAnchor();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Real-time SOL price
  const { solPriceUsd } = useSolPrice();

  // Get the selected store ID from session storage
  const selectedStoreId = sessionStorage.getItem("selectedStoreId");

  // Calculate subtotal in USDC (fixed pricing)
  const subtotalUsdc = cartItems.reduce((acc, item: CartItemType) => {
    // Assuming product price is stored in USDC
    const usdcPrice = item.product.price; // This should be USDC price
    return acc + (usdcPrice * item.quantity);
  }, 0);

  // Calculate equivalent SOL amount for payment
  const subtotalSol = PriceConverter.usdcToSol(subtotalUsdc, solPriceUsd);

  // Function to navigate to store selection
  const navigateToStoreSelection = () => {
    navigate("/store-selection");
  };

  const handleCheckout = () => {
    try {
      if (cartItems.length === 0) {
        toast.error("Your cart is empty");
        return;
      }

      // Check if a store is selected
      if (!selectedStoreId) {
        toast.info("Please select a store to continue");
        navigateToStoreSelection();
        return;
      }

      // Save cart total for the payment page (in SOL for payment)
      sessionStorage.setItem("cartTotal", subtotalSol.toString());
      sessionStorage.setItem("cartTotalUsdc", subtotalUsdc.toString());

      // Navigate to payment page with store ID
      navigate(`/payment?storeId=${selectedStoreId}`);
    } catch (error) {
      console.error("Unexpected error in handleCheckout:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Button onClick={() => navigate("/")} variant="outline">
            Continue Shopping
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cart items */}
          <div className="space-y-4">
            {cartItems.map((item, index) => (
              <CartItem
                key={index}
                item={item}
                updateQuantity={updateQuantity}
                removeItem={removeItem}
                solPriceInUsdc={solPriceUsd}
              />
            ))}
          </div>

          {/* Cart summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-lg">Subtotal:</span>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-2xl text-green-600">${subtotalUsdc.toFixed(2)}</span>
                  <span className="font-semibold text-lg text-green-600">USDC</span>
                </div>
                <div className="flex items-center gap-1 justify-end mt-1">
                  <Coins className="w-3 h-3 text-gray-500" />
                  <span className="text-sm text-gray-500">
                    You'll pay: {subtotalSol.toFixed(4)} SOL
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={isProcessingPayment || cartItems.length === 0 || !solPriceUsd}
              >
                {isProcessingPayment ? "Processing..." : "Proceed to Checkout"}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/store-selection")}
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper component that provides the Profile context
const Cart = () => {
  return (
    <Layout role="end_user">
      <CartContent />
    </Layout>
  );
};

export default Cart;
