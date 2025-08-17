import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCryptoPrice } from '@/hooks/useCryptoPrice';

const CryptoPriceDisplay: React.FC = () => {
  const { prices, loading, error } = useCryptoPrice(['solana', 'bitcoin', 'ethereum']);

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-pulse text-xs text-gray-300">Loading live prices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-xs text-red-300">Price data unavailable</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-1 text-xs">
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        <span className="text-yellow-400 font-semibold">LIVE PRICES</span>
      </div>
      
      <div className="flex items-center space-x-6">
        {prices.map((crypto) => (
          <div key={crypto.id} className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <span className="font-bold text-xs">{crypto.symbol}</span>
              <span className="text-xs text-gray-300">$</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-xs">
                {crypto.current_price.toFixed(crypto.current_price < 1 ? 4 : 2)}
              </span>
              
              <div className={`flex items-center space-x-1 ${
                crypto.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {crypto.price_change_percentage_24h >= 0 ? (
                  <TrendingUp size={10} />
                ) : (
                  <TrendingDown size={10} />
                )}
                <span className="text-xs">
                  {Math.abs(crypto.price_change_percentage_24h).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-gray-400">
        CoinGecko
      </div>
    </div>
  );
};

export default CryptoPriceDisplay;
