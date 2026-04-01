// Price cache management for POE2 currencies

import { Currency, currencyInfo } from '../types/currencies';

interface CurrencyPrice {
  [currencyEnum: string]: number; // Maps Currency enum value to price
}

interface PriceCache {
  prices: CurrencyPrice;
  lastUpdated: number;
}

// In-memory price cache
let priceCache: PriceCache = {
  prices: {},
  lastUpdated: 0,
};

// Default configuration
const defaultConfig = {
  referenceCurrency: 'exalted' as 'exalted' | 'chaos',
  league: 'Fate of the Vaal',
};

/**
 * Fetch and update currency prices from POE2Scout API
 * Runs in the background periodically (every 60 minutes)
 */
export async function updateCurrencyPrices(): Promise<void> {
  try {
    // Get configuration from storage
    const config = await chrome.storage.sync.get(['referenceCurrency', 'league']);
    const referenceCurrency = config.referenceCurrency || defaultConfig.referenceCurrency;
    const league = config.league || defaultConfig.league;

    // Fetch prices from POE2 Scout API
    const url = `https://poe2scout.com/api/items/currency/currency?referenceCurrency=${referenceCurrency}&page=1&perPage=100&league=${league}`;
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.data && Array.isArray(data.data)) {
      const newPrices: CurrencyPrice = {};

      // Map API results to Currency enum
      for (const item of data.data) {
        const currencyName = item.name || '';
        // Find matching Currency enum by display name
        const matchingCurrency = Object.entries(currencyInfo).find(
          ([_, info]) => info.name.toLowerCase() === currencyName.toLowerCase()
        );

        if (matchingCurrency) {
          const currencyEnum = matchingCurrency[0] as Currency;
          newPrices[currencyEnum] = item.receive?.value || 0;
        }
      }

      // Update cache
      priceCache = {
        prices: newPrices,
        lastUpdated: Date.now(),
      };

      console.log(`Updated ${Object.keys(newPrices).length} currency prices`);
    }
  } catch (error) {
    console.error('Error updating currency prices:', error);
  }
}

/**
 * Get the cached price for a specific currency
 * @param currency The Currency enum value to look up
 * @returns The cached price, or 0 if not available
 */
export function getCurrencyPrice(currency: Currency): number {
  return priceCache.prices[currency] || 0;
}

/**
 * Get the current price cache state
 * @returns The current price cache object
 */
export function getPriceCache(): Readonly<PriceCache> {
  return priceCache;
}

/**
 * Get the POESESSID from local storage
 * @returns Promise resolving to the POESESSID or empty string if not set
 */
export async function getPoeSessId(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get('poeSessId', (data: { poeSessId?: string }) => {
      resolve(data.poeSessId || '');
    });
  });
}
