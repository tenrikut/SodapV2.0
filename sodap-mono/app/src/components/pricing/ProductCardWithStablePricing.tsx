import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { ProductWithStablePricing, Currency } from '@/types/pricing';
import StablePriceDisplay from './StablePriceDisplay';

interface ProductCardWithStablePricingProps {
  product: ProductWithStablePricing;
  onAddToCart?: (product: ProductWithStablePricing, quantity: number) => void;
  onRefreshPrice?: (productId: string) => void;
  isRefreshing?: boolean;
  preferredCurrency?: Currency;
  showQuantityControls?: boolean;
  className?: string;
}

export const ProductCardWithStablePricing: React.FC<ProductCardWithStablePricingProps> = ({
  product,
  onAddToCart,
  onRefreshPrice,
  isRefreshing = false,
  preferredCurrency = Currency.USDC,
  showQuantityControls = true,
  className = ''
}) => {
  const [quantity, setQuantity] = useState(1);

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product, quantity);
    }
  };

  const handleRefreshPrice = () => {
    if (onRefreshPrice) {
      onRefreshPrice(product.uuid);
    }
  };

  return (
    <Card className={`w-full max-w-sm overflow-hidden transition-all duration-200 hover:shadow-lg ${className}`}>
      {/* Product Image */}
      <div className="aspect-square overflow-hidden">
        <img
          src={product.imageUri || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
        />
      </div>

      <CardHeader className="pb-2">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2">
            {product.name}
          </h3>
          
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="py-2">
        <div className="space-y-3">
          {/* Stable Pricing Display */}
          <StablePriceDisplay
            stablePrice={product.stablePricing}
            showBothCurrencies={false}
            defaultCurrency={preferredCurrency}
            onRefreshPrice={handleRefreshPrice}
            isRefreshing={isRefreshing}
          />

          {/* Stock Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {product.stock > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  {product.stock} in stock
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  Out of stock
                </Badge>
              )}
              
              {!product.isActive && (
                <Badge variant="outline" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          </div>

          {/* Quantity Controls */}
          {showQuantityControls && product.stock > 0 && product.isActive && (
            <div className="flex items-center justify-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <span className="font-medium text-lg min-w-[2rem] text-center">
                {quantity}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={incrementQuantity}
                disabled={quantity >= product.stock}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        {product.stock > 0 && product.isActive ? (
          <Button
            onClick={handleAddToCart}
            disabled={!onAddToCart}
            className="w-full"
            size="sm"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        ) : (
          <Button disabled className="w-full" size="sm">
            {!product.isActive ? 'Unavailable' : 'Out of Stock'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProductCardWithStablePricing;
