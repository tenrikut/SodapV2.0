import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, DollarSign, RefreshCw } from 'lucide-react';
import { Currency, StablePrice, PriceConverter } from '@/types/pricing';

interface StablePriceDisplayProps {
  stablePrice: StablePrice;
  showBothCurrencies?: boolean;
  defaultCurrency?: Currency;
  className?: string;
  onRefreshPrice?: () => void;
  isRefreshing?: boolean;
}

export const StablePriceDisplay: React.FC<StablePriceDisplayProps> = ({
  stablePrice,
  showBothCurrencies = true,
  defaultCurrency = Currency.USDC,
  className = '',
  onRefreshPrice,
  isRefreshing = false
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(defaultCurrency);
  
  const priceDisplays = PriceConverter.getBothPriceDisplays(stablePrice);
  const isStale = PriceConverter.isPricingStale(stablePrice);
  
  const currentDisplay = selectedCurrency === Currency.SOL 
    ? priceDisplays.sol 
    : priceDisplays.usdc;

  const toggleCurrency = () => {
    setSelectedCurrency(prev => prev === Currency.SOL ? Currency.USDC : Currency.SOL);
  };

  return (
    <div className={`stable-price-display ${className}`}>
      {showBothCurrencies ? (
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Stable Pricing</span>
              {onRefreshPrice && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefreshPrice}
                  disabled={isRefreshing || stablePrice.isFixed}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Currency Toggle */}
              <div className="flex items-center justify-center space-x-3">
                <Label htmlFor="currency-toggle" className="text-sm font-medium">
                  {Currency.USDC}
                </Label>
                <Switch
                  id="currency-toggle"
                  checked={selectedCurrency === Currency.SOL}
                  onCheckedChange={toggleCurrency}
                />
                <Label htmlFor="currency-toggle" className="text-sm font-medium">
                  {Currency.SOL}
                </Label>
              </div>

              {/* Primary Price Display */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {currentDisplay.formattedPrice}
                </div>
                
                {/* Secondary Price */}
                <div className="text-sm text-gray-500 mt-1">
                  ≈ {selectedCurrency === Currency.SOL 
                    ? priceDisplays.usdc.formattedPrice 
                    : priceDisplays.sol.formattedPrice
                  }
                </div>
              </div>

              {/* Price Status Badges */}
              <div className="flex justify-center space-x-2">
                {stablePrice.isFixed ? (
                  <Badge variant="secondary" className="text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Fixed Price
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Live Price
                  </Badge>
                )}
                
                {isStale && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Stale
                  </Badge>
                )}
              </div>

              {/* Last Updated */}
              <div className="text-xs text-gray-400 text-center">
                Updated: {stablePrice.lastUpdated.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Compact Single Currency Display */
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold">
            {currentDisplay.formattedPrice}
          </span>
          
          {isStale && (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          
          {stablePrice.isFixed && (
            <Badge variant="secondary" className="text-xs">
              Fixed
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default StablePriceDisplay;
