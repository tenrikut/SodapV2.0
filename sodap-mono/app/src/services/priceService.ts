import { Connection, PublicKey } from '@solana/web3.js';

export interface PriceData {
  solPriceUsd: number;
  lastUpdated: number;
  source: string;
}

export class PriceService {
  private static instance: PriceService;
  private cachedPrice: PriceData | null = null;
  private cacheExpiry: number = 60000; // 1 minute cache
  private connection: Connection;

  private constructor() {
    this.connection = new Connection(process.env.REACT_APP_RPC_URL || 'https://api.mainnet-beta.solana.com');
  }

  public static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService();
    }
    return PriceService.instance;
  }

  /**
   * Get SOL price in USD from multiple sources with fallback
   */
  async getSolPriceUsd(): Promise<number> {
    // Return cached price if still valid
    if (this.cachedPrice && Date.now() - this.cachedPrice.lastUpdated < this.cacheExpiry) {
      return this.cachedPrice.solPriceUsd;
    }

    try {
      // Try Jupiter API first (Solana-native)
      const jupiterPrice = await this.getJupiterPrice();
      if (jupiterPrice) {
        this.cachedPrice = {
          solPriceUsd: jupiterPrice,
          lastUpdated: Date.now(),
          source: 'Jupiter'
        };
        return jupiterPrice;
      }
    } catch (error) {
      console.warn('Jupiter API failed:', error);
    }

    try {
      // Fallback to CoinGecko
      const coingeckoPrice = await this.getCoinGeckoPrice();
      if (coingeckoPrice) {
        this.cachedPrice = {
          solPriceUsd: coingeckoPrice,
          lastUpdated: Date.now(),
          source: 'CoinGecko'
        };
        return coingeckoPrice;
      }
    } catch (error) {
      console.warn('CoinGecko API failed:', error);
    }

    try {
      // Last resort: Pyth Network on-chain oracle
      const pythPrice = await this.getPythPrice();
      if (pythPrice) {
        this.cachedPrice = {
          solPriceUsd: pythPrice,
          lastUpdated: Date.now(),
          source: 'Pyth'
        };
        return pythPrice;
      }
    } catch (error) {
      console.warn('Pyth Network failed:', error);
    }

    // If all APIs fail, return cached price or fallback
    if (this.cachedPrice) {
      console.warn('Using stale cached price');
      return this.cachedPrice.solPriceUsd;
    }

    console.error('All price sources failed, using fallback');
    return 100; // Fallback price
  }

  /**
   * Jupiter API - Real-time Solana DEX aggregated prices
   */
  private async getJupiterPrice(): Promise<number | null> {
    const response = await fetch('https://price.jup.ag/v4/price?ids=SOL', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data?.SOL?.price || null;
  }

  /**
   * CoinGecko API - Reliable market data
   */
  private async getCoinGeckoPrice(): Promise<number | null> {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return data.solana?.usd || null;
  }

  /**
   * Pyth Network - On-chain oracle data
   */
  private async getPythPrice(): Promise<number | null> {
    try {
      // Pyth SOL/USD price account
      const pythSolUsd = new PublicKey('H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG');
      
      const accountInfo = await this.connection.getAccountInfo(pythSolUsd);
      if (!accountInfo) {
        throw new Error('Pyth account not found');
      }

      // Parse Pyth price data (simplified - in production use @pythnetwork/client)
      // This is a basic implementation - you'd want to use the official Pyth SDK
      const data = accountInfo.data;
      if (data.length < 240) {
        throw new Error('Invalid Pyth data length');
      }

      // Basic price extraction (this is simplified)
      // In production, use: import { PythHttpClient } from '@pythnetwork/client'
      const priceBuffer = data.slice(208, 216);
      const price = priceBuffer.readBigInt64LE(0);
      const expo = data.readInt32LE(216);
      
      return Number(price) * Math.pow(10, expo);
    } catch (error) {
      console.error('Pyth price parsing error:', error);
      return null;
    }
  }

  /**
   * Get cached price info for debugging
   */
  getCachedPriceInfo(): PriceData | null {
    return this.cachedPrice;
  }

  /**
   * Force refresh price (bypass cache)
   */
  async refreshPrice(): Promise<number> {
    this.cachedPrice = null;
    return await this.getSolPriceUsd();
  }

  /**
   * Subscribe to price updates (polling-based)
   */
  subscribeToPrice(callback: (price: number) => void, intervalMs: number = 30000): () => void {
    const interval = setInterval(async () => {
      try {
        const price = await this.getSolPriceUsd();
        callback(price);
      } catch (error) {
        console.error('Price subscription error:', error);
      }
    }, intervalMs);

    // Return unsubscribe function
    return () => clearInterval(interval);
  }
}

// Export singleton instance
export const priceService = PriceService.getInstance();
