export enum Currency {
  SOL = 'SOL',
  USDC = 'USDC'
}

export interface StablePrice {
  usdcPrice: number; // Price in USDC (human-readable format)
  solPrice: number;  // Price in SOL (human-readable format)
  lastUpdated: Date;
  isFixed: boolean;
}

export interface ProductWithStablePricing {
  uuid: string;
  name: string;
  description: string;
  imageUri: string;
  price: number;          // Legacy price field
  stablePricing: StablePrice;
  stock: number;
  isActive: boolean;
  store: string;
  authority: string;
}

export interface PriceDisplay {
  currency: Currency;
  formattedPrice: string;
  rawPrice: number;
}

export class PriceConverter {
  /**
   * Convert USDC to SOL using current exchange rate
   */
  static usdcToSol(usdcAmount: number, solPriceInUsdc: number): number {
    if (solPriceInUsdc === 0) {
      throw new Error('SOL price cannot be zero');
    }
    return usdcAmount / solPriceInUsdc;
  }

  /**
   * Convert SOL to USDC using current exchange rate
   */
  static solToUsdc(solAmount: number, solPriceInUsdc: number): number {
    return solAmount * solPriceInUsdc;
  }

  /**
   * Get price in specified currency
   */
  static getPriceInCurrency(stablePrice: StablePrice, currency: Currency): number {
    switch (currency) {
      case Currency.SOL:
        return stablePrice.solPrice;
      case Currency.USDC:
        return stablePrice.usdcPrice;
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }
  }

  /**
   * Format price for display
   */
  static formatPriceForDisplay(price: number, currency: Currency): string {
    switch (currency) {
      case Currency.SOL:
        return `${price.toFixed(4)} SOL`;
      case Currency.USDC:
        return `$${price.toFixed(2)}`;
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }
  }

  /**
   * Calculate total price for multiple products
   */
  static calculateTotalPrice(
    products: ProductWithStablePricing[],
    quantities: number[],
    currency: Currency
  ): number {
    if (products.length !== quantities.length) {
      throw new Error('Products and quantities arrays must have the same length');
    }

    return products.reduce((total, product, index) => {
      const unitPrice = this.getPriceInCurrency(product.stablePricing, currency);
      return total + (unitPrice * quantities[index]);
    }, 0);
  }

  /**
   * Check if pricing data is stale (older than 1 hour)
   */
  static isPricingStale(stablePrice: StablePrice): boolean {
    if (stablePrice.isFixed) {
      return false; // Fixed prices never go stale
    }

    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    const now = new Date();
    return (now.getTime() - stablePrice.lastUpdated.getTime()) > oneHour;
  }

  /**
   * Get both price displays for a product
   */
  static getBothPriceDisplays(stablePrice: StablePrice): {
    sol: PriceDisplay;
    usdc: PriceDisplay;
  } {
    return {
      sol: {
        currency: Currency.SOL,
        formattedPrice: this.formatPriceForDisplay(stablePrice.solPrice, Currency.SOL),
        rawPrice: stablePrice.solPrice
      },
      usdc: {
        currency: Currency.USDC,
        formattedPrice: this.formatPriceForDisplay(stablePrice.usdcPrice, Currency.USDC),
        rawPrice: stablePrice.usdcPrice
      }
    };
  }

  /**
   * Convert raw blockchain values to human-readable format
   */
  static fromRawValues(rawUsdcPrice: number, rawSolPrice: number, lastUpdated: number, isFixed: boolean): StablePrice {
    return {
      usdcPrice: rawUsdcPrice / 1_000_000, // Convert from 6 decimals
      solPrice: rawSolPrice / 1_000_000_000, // Convert from 9 decimals
      lastUpdated: new Date(lastUpdated * 1000), // Convert from unix timestamp
      isFixed
    };
  }

  /**
   * Convert human-readable format to raw blockchain values
   */
  static toRawValues(stablePrice: StablePrice): {
    rawUsdcPrice: number;
    rawSolPrice: number;
    lastUpdated: number;
  } {
    return {
      rawUsdcPrice: Math.round(stablePrice.usdcPrice * 1_000_000), // Convert to 6 decimals
      rawSolPrice: Math.round(stablePrice.solPrice * 1_000_000_000), // Convert to 9 decimals
      lastUpdated: Math.floor(stablePrice.lastUpdated.getTime() / 1000) // Convert to unix timestamp
    };
  }
}
