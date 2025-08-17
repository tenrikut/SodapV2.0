import { useState, useEffect, useCallback } from 'react';
import { priceService, PriceData } from '../services/priceService';

export interface UseSolPriceReturn {
  solPriceUsd: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  source: string | null;
  refreshPrice: () => Promise<void>;
}

export const useSolPrice = (autoRefreshMs?: number): UseSolPriceReturn => {
  const [solPriceUsd, setSolPriceUsd] = useState<number>(100); // Default fallback
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const price = await priceService.getSolPriceUsd();
      const priceInfo = priceService.getCachedPriceInfo();
      
      setSolPriceUsd(price);
      setLastUpdated(priceInfo?.lastUpdated || Date.now());
      setSource(priceInfo?.source || 'Unknown');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch SOL price';
      setError(errorMessage);
      console.error('Price fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshPrice = useCallback(async () => {
    try {
      setError(null);
      const price = await priceService.refreshPrice();
      const priceInfo = priceService.getCachedPriceInfo();
      
      setSolPriceUsd(price);
      setLastUpdated(priceInfo?.lastUpdated || Date.now());
      setSource(priceInfo?.source || 'Unknown');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh SOL price';
      setError(errorMessage);
      console.error('Price refresh error:', err);
    }
  }, []);

  // Initial price fetch
  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // Auto-refresh subscription
  useEffect(() => {
    if (!autoRefreshMs) return;

    const unsubscribe = priceService.subscribeToPrice(
      (newPrice) => {
        setSolPriceUsd(newPrice);
        const priceInfo = priceService.getCachedPriceInfo();
        setLastUpdated(priceInfo?.lastUpdated || Date.now());
        setSource(priceInfo?.source || 'Unknown');
        setError(null);
      },
      autoRefreshMs
    );

    return unsubscribe;
  }, [autoRefreshMs]);

  return {
    solPriceUsd,
    isLoading,
    error,
    lastUpdated,
    source,
    refreshPrice,
  };
};

// Hook for getting formatted price display
export const useFormattedSolPrice = (autoRefreshMs?: number) => {
  const { solPriceUsd, isLoading, error, lastUpdated, source, refreshPrice } = useSolPrice(autoRefreshMs);

  const formatPrice = useCallback((price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }, []);

  const formatLastUpdated = useCallback((timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }, []);

  return {
    solPriceUsd,
    formattedPrice: formatPrice(solPriceUsd),
    isLoading,
    error,
    lastUpdated,
    formattedLastUpdated: formatLastUpdated(lastUpdated),
    source,
    refreshPrice,
  };
};
