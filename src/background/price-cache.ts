// Price cache management for POE2 currencies

import { Currency, currencyInfo } from '../types/currencies.js';

interface CurrencyPrice {
  [currencyName: string]: number; // Maps Currency enum value to price
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

function normalizeReferenceCurrency(
  raw: unknown,
): 'exalted' | 'chaos' {
  if (raw === 'exalted' || raw === 'chaos') {
    return raw;
  }

  // Handle cases where we stored a Currency enum value
  if (raw === Currency.EXALTED_ORB || raw === 'EXALTED_ORB') {
    return 'exalted';
  }
  if (raw === Currency.CHAOS_ORB || raw === 'CHAOS_ORB') {
    return 'chaos';
  }

  return defaultConfig.referenceCurrency;
}

/**
 * Fetch and update currency prices from POE2Scout API
 * Runs in the background periodically (every 60 minutes)
 */
export async function updateCurrencyPrices(): Promise<void> {
  try {
    // Get configuration from storage
    const config = await chrome.storage.sync.get(['referenceCurrency', 'league']);
    const referenceCurrency = normalizeReferenceCurrency(config.referenceCurrency);
    const league = config.league || defaultConfig.league;

    // Fetch prices from POE2 Scout API
    const url = `https://poe2scout.com/api/items/currency/currency?referenceCurrency=${referenceCurrency}&page=1&perPage=100&league=${league}`;
    const response = await fetch(url);
    const data: any = await response.json();

    console.log('Fetched currency prices from API:', data);


    if (!data || !data.items || !Array.isArray(data.items)) {
      console.error('Invalid API response format:', data);
      return;
    }

    const newPrices: CurrencyPrice = {};


  // Map API results to Currency enum
    for (const item of data.items) {
        // const currencyId = item.id
        // const currencyName = item.apiId
        const currencyText = item.text
        const price = item.currentPrice



        const matchingCurrencyInfo = Object.entries(currencyInfo).find(
        ([_, info]) => (info.name === currencyText)
        );

        if (matchingCurrencyInfo) {
            const [currEnumKey, _] = matchingCurrencyInfo;
            const currObj = Currency[currEnumKey as keyof typeof Currency];
            newPrices[currObj] = price || -1;
        }
    }

    priceCache = {
        prices: newPrices,
        lastUpdated: Date.now(),
    };
    console.log('Updated price cache:', priceCache);

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
