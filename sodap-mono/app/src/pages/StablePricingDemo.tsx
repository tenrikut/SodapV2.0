import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { ProductWithStablePricing, Currency } from '@/types/pricing';
import StablePriceDisplay from '@/components/pricing/StablePriceDisplay';
import ProductCardWithStablePricing from '@/components/pricing/ProductCardWithStablePricing';
import CartWithStablePricing from '@/components/pricing/CartWithStablePricing';

// Mock product data
const mockProducts: ProductWithStablePricing[] = [
  {
    uuid: '1',
    name: 'Luxury Watch',
    description: 'Premium timepiece with Swiss movement',
    imageUri: '/images/omega.png',
    price: 500, // Legacy field
    stablePricing: {
      usdcPrice: 1250.00,
      solPrice: 12.50, // Assuming 1 SOL = $100
      lastUpdated: new Date(),
      isFixed: true
    },
    stock: 5,
    isActive: true,
    store: 'store1',
    authority: 'auth1'
  },
  {
    uuid: '2',
    name: 'Sports Watch',
    description: 'Durable watch for active lifestyle',
    imageUri: '/images/seiko.png',
    price: 200, // Legacy field
    stablePricing: {
      usdcPrice: 299.99,
      solPrice: 3.00, // Live pricing
      lastUpdated: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      isFixed: false
    },
    stock: 12,
    isActive: true,
    store: 'store1',
    authority: 'auth1'
  },
  {
    uuid: '3',
    name: 'Classic Timepiece',
    description: 'Vintage-inspired design with modern features',
    imageUri: '/images/tag.png',
    price: 350, // Legacy field
    stablePricing: {
      usdcPrice: 450.00,
      solPrice: 4.50,
      lastUpdated: new Date(Date.now() - 90 * 60 * 1000), // 90 minutes ago (stale)
      isFixed: false
    },
    stock: 8,
    isActive: true,
    store: 'store1',
    authority: 'auth1'
  }
];

const StablePricingDemo: React.FC = () => {
  const [cartItems, setCartItems] = useState<Array<{product: ProductWithStablePricing, quantity: number}>>([]);
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>(Currency.USDC);
  const [refreshingProducts, setRefreshingProducts] = useState<Set<string>>(new Set());

  const handleAddToCart = (product: ProductWithStablePricing, quantity: number) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.product.uuid === product.uuid);
      if (existingItem) {
        return prev.map(item =>
          item.product.uuid === product.uuid
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prev, { product, quantity }];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    setCartItems(prev =>
      prev.map(item =>
        item.product.uuid === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.uuid !== productId));
  };

  const handleRefreshPrice = (productId: string) => {
    setRefreshingProducts(prev => new Set([...prev, productId]));
    
    // Simulate price refresh
    setTimeout(() => {
      setRefreshingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }, 2000);
  };

  const handleCheckout = (items: any, totals: any) => {
    alert(`Checkout initiated!\nTotal: ${totals.formattedUsdcTotal} / ${totals.formattedSolTotal}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">SODAP v2.0 Stable Pricing Demo</h1>
        <p className="text-gray-600 mb-4">
          Experience stable pricing in both USDC and SOL with real-time conversion and stale price detection.
        </p>
        
        {/* Currency Preference */}
        <div className="flex items-center space-x-4 mb-6">
          <span className="font-medium">Preferred Currency:</span>
          <div className="flex space-x-2">
            <Button
              variant={preferredCurrency === Currency.USDC ? "default" : "outline"}
              size="sm"
              onClick={() => setPreferredCurrency(Currency.USDC)}
            >
              USDC ($)
            </Button>
            <Button
              variant={preferredCurrency === Currency.SOL ? "default" : "outline"}
              size="sm"
              onClick={() => setPreferredCurrency(Currency.SOL)}
            >
              SOL (◎)
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Products Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Featured Products</span>
                <div className="flex space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    Fixed Pricing
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Live Pricing
                  </Badge>
                  <Badge variant="destructive" className="text-xs">
                    Stale Pricing
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {mockProducts.map((product) => (
                  <ProductCardWithStablePricing
                    key={product.uuid}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onRefreshPrice={handleRefreshPrice}
                    isRefreshing={refreshingProducts.has(product.uuid)}
                    preferredCurrency={preferredCurrency}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Pricing Display */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Detailed Stable Pricing Example</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Luxury Watch - Fixed Pricing</h4>
                  <StablePriceDisplay
                    stablePrice={mockProducts[0].stablePricing}
                    showBothCurrencies={true}
                    defaultCurrency={preferredCurrency}
                    onRefreshPrice={() => handleRefreshPrice(mockProducts[0].uuid)}
                    isRefreshing={refreshingProducts.has(mockProducts[0].uuid)}
                  />
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Sports Watch - Live Pricing</h4>
                  <StablePriceDisplay
                    stablePrice={mockProducts[1].stablePricing}
                    showBothCurrencies={true}
                    defaultCurrency={preferredCurrency}
                    onRefreshPrice={() => handleRefreshPrice(mockProducts[1].uuid)}
                    isRefreshing={refreshingProducts.has(mockProducts[1].uuid)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <CartWithStablePricing
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            preferredCurrency={preferredCurrency}
          />

          {/* Feature Highlights */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Stable Pricing Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>Real-time Conversion:</strong> Prices displayed in both USDC and SOL with live exchange rates</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>Fixed & Live Pricing:</strong> Support for both stable fixed prices and dynamic market pricing</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>Stale Detection:</strong> Automatic detection of outdated prices with visual indicators</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>User Preference:</strong> Switch between USDC and SOL as primary display currency</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>Cart Integration:</strong> Automatic total calculation in both currencies</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StablePricingDemo;
