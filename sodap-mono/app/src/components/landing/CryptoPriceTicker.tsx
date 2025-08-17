import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCryptoPrice } from '@/hooks/useCryptoPrice';

const CryptoPriceTicker: React.FC = () => {
  const { prices, loading, error } = useCryptoPrice(['solana', 'bitcoin', 'ethereum']);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 text-white py-3 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-sm">Loading crypto prices...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 text-white py-3 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="text-sm text-red-300">Unable to load crypto prices</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 text-white py-3 overflow-hidden relative">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-semibold">LIVE PRICES</span>
          </div>
          
          <div className="flex items-center space-x-8 overflow-x-auto">
            {prices.map((crypto) => (
              <div key={crypto.id} className="flex items-center space-x-2 whitespace-nowrap">
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-sm">{crypto.symbol}</span>
                  <span className="text-xs text-gray-300">/USD</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <span className="font-semibold text-sm">
                    ${crypto.current_price.toFixed(crypto.current_price < 1 ? 6 : 2)}
                  </span>
                  
                  <div className={`flex items-center space-x-1 ${
                    crypto.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {crypto.price_change_percentage_24h >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    <span className="text-xs font-medium">
                      {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-400">
            Powered by CoinGecko
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoPriceTicker;
