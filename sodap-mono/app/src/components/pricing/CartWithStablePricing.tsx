import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { ProductWithStablePricing, Currency, PriceConverter } from '@/types/pricing';

interface CartItem {
  product: ProductWithStablePricing;
  quantity: number;
}

interface CartWithStablePricingProps {
  items: CartItem[];
  onUpdateQuantity?: (productId: string, newQuantity: number) => void;
  onRemoveItem?: (productId: string) => void;
  onCheckout?: (items: CartItem[], totals: CartTotals) => void;
  preferredCurrency?: Currency;
  className?: string;
}

interface CartTotals {
  solTotal: number;
  usdcTotal: number;
  itemCount: number;
  formattedSolTotal: string;
  formattedUsdcTotal: string;
}

export const CartWithStablePricing: React.FC<CartWithStablePricingProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  preferredCurrency = Currency.USDC,
  className = ''
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(preferredCurrency);

  // Calculate cart totals
  const totals: CartTotals = useMemo(() => {
    const solTotal = PriceConverter.calculateTotalPrice(
      items.map(item => item.product),
      items.map(item => item.quantity),
      Currency.SOL
    );

    const usdcTotal = PriceConverter.calculateTotalPrice(
      items.map(item => item.product),
      items.map(item => item.quantity),
      Currency.USDC
    );

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      solTotal,
      usdcTotal,
      itemCount,
      formattedSolTotal: PriceConverter.formatPriceForDisplay(solTotal, Currency.SOL),
      formattedUsdcTotal: PriceConverter.formatPriceForDisplay(usdcTotal, Currency.USDC)
    };
  }, [items]);

  const handleQuantityChange = (productId: string, delta: number) => {
    const item = items.find(i => i.product.uuid === productId);
    if (item && onUpdateQuantity) {
      const newQuantity = Math.max(1, Math.min(item.quantity + delta, item.product.stock));
      onUpdateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveItem = (productId: string) => {
    if (onRemoveItem) {
      onRemoveItem(productId);
    }
  };

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout(items, totals);
    }
  };

  if (items.length === 0) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-center">Your cart is empty</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Shopping Cart ({totals.itemCount} items)</span>
          <div className="flex items-center space-x-2">
            <Button
              variant={selectedCurrency === Currency.USDC ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCurrency(Currency.USDC)}
            >
              USD
            </Button>
            <Button
              variant={selectedCurrency === Currency.SOL ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCurrency(Currency.SOL)}
            >
              SOL
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-3">
          {items.map((item) => {
            const itemPrice = PriceConverter.getPriceInCurrency(
              item.product.stablePricing,
              selectedCurrency
            );
            const itemTotal = itemPrice * item.quantity;

            return (
              <div key={item.product.uuid} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {/* Product Image */}
                <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                  <img
                    src={item.product.imageUri || '/placeholder.svg'}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                  <p className="text-xs text-gray-500">
                    {PriceConverter.formatPriceForDisplay(itemPrice, selectedCurrency)} each
                  </p>
                  <p className="text-sm font-semibold">
                    {PriceConverter.formatPriceForDisplay(itemTotal, selectedCurrency)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(item.product.uuid, -1)}
                    disabled={item.quantity <= 1}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  
                  <span className="font-medium min-w-[1.5rem] text-center text-sm">
                    {item.quantity}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(item.product.uuid, 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(item.product.uuid)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Cart Summary */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total in {selectedCurrency}:</span>
            <span className="text-xl font-bold">
              {selectedCurrency === Currency.SOL ? totals.formattedSolTotal : totals.formattedUsdcTotal}
            </span>
          </div>

          {/* Alternative Currency Display */}
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>≈ {selectedCurrency === Currency.SOL ? 'USDC' : 'SOL'}:</span>
            <span>
              {selectedCurrency === Currency.SOL ? totals.formattedUsdcTotal : totals.formattedSolTotal}
            </span>
          </div>

          {/* Pricing Status */}
          <div className="flex flex-wrap gap-1">
            {items.some(item => item.product.stablePricing.isFixed) && (
              <Badge variant="secondary" className="text-xs">
                Some items have fixed pricing
              </Badge>
            )}
            {items.some(item => PriceConverter.isPricingStale(item.product.stablePricing)) && (
              <Badge variant="destructive" className="text-xs">
                Some prices may be stale
              </Badge>
            )}
          </div>

          {/* Checkout Button */}
          <Button
            onClick={handleCheckout}
            disabled={!onCheckout || items.length === 0}
            className="w-full"
            size="lg"
          >
            Proceed to Checkout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CartWithStablePricing;
