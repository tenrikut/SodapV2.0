import { useState, useEffect } from 'react';

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
}

interface UseCryptoPriceReturn {
  prices: CryptoPrice[];
  loading: boolean;
  error: string | null;
}

export const useCryptoPrice = (coinIds: string[] = ['solana', 'bitcoin', 'ethereum']): UseCryptoPriceReturn => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const coinIdsString = coinIds.join(',');
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIdsString}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch crypto prices');
        }
        
        const data = await response.json();
        
        // Transform the data to match our interface
        const transformedPrices: CryptoPrice[] = coinIds.map(coinId => {
          const coinData = data[coinId];
          return {
            id: coinId,
            symbol: coinId === 'solana' ? 'SOL' : coinId === 'bitcoin' ? 'BTC' : 'ETH',
            name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
            current_price: coinData?.usd || 0,
            price_change_percentage_24h: coinData?.usd_24h_change || 0,
            market_cap: coinData?.usd_market_cap || 0,
          };
        });
        
        setPrices(transformedPrices);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        console.error('Error fetching crypto prices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    
    // Update prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    
    return () => clearInterval(interval);
  }, [coinIds.join(',')]);

  return { prices, loading, error };
};
