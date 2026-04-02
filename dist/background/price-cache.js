// Price cache management for POE2 currencies
import { Currency, currencyInfo } from '../types/currencies.js';
const CURRENCY_PRICE_CACHE_KEY = 'currencyPriceCacheV1';
// In-memory price cache (hydrated from storage on load)
let priceCache = {
    prices: {},
    lastUpdated: 0,
};
// Hydrate price cache from local storage on load
chrome.storage.local.get(CURRENCY_PRICE_CACHE_KEY, (data) => {
    const stored = data[CURRENCY_PRICE_CACHE_KEY];
    if (!stored || typeof stored !== 'object') {
        return;
    }
    const { prices, lastUpdated } = stored;
    if (!prices || typeof lastUpdated !== 'number') {
        return;
    }
    priceCache = { prices, lastUpdated };
});
function persistCurrencyPriceCache() {
    chrome.storage.local.set({
        [CURRENCY_PRICE_CACHE_KEY]: priceCache,
    });
}
// Default configuration
const defaultConfig = {
    referenceCurrency: 'exalted',
    league: 'Fate of the Vaal',
};
function normalizeReferenceCurrency(raw) {
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
 * Fetch and update currency prices from POE2Scout API.
 * If cached data is less than one hour old, re-use it and skip the fetch.
 */
export async function updateCurrencyPrices() {
    try {
        const ONE_HOUR_MS = 60 * 60 * 1000;
        const now = Date.now();
        // If we have cached data newer than one hour, do not hit the API again.
        if (priceCache.lastUpdated && now - priceCache.lastUpdated < ONE_HOUR_MS) {
            console.log('Skipping currency price update; cache is still fresh:', new Date(priceCache.lastUpdated).toISOString());
            return;
        }
        // Get configuration from storage
        const config = await chrome.storage.sync.get(['referenceCurrency', 'league']);
        const referenceCurrency = normalizeReferenceCurrency(config.referenceCurrency);
        const league = config.league || defaultConfig.league;
        // Fetch prices from POE2 Scout API
        const url = `https://poe2scout.com/api/items/currency/currency?referenceCurrency=${referenceCurrency}&page=1&perPage=100&league=${league}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('Fetched currency prices from API:', data);
        if (!data || !data.items || !Array.isArray(data.items)) {
            console.error('Invalid API response format:', data);
            return;
        }
        const newPrices = {};
        // Map API results to Currency enum
        for (const item of data.items) {
            // const currencyId = item.id
            // const currencyName = item.apiId
            const currencyText = item.text;
            const price = item.currentPrice;
            const matchingCurrencyInfo = Object.entries(currencyInfo).find(([_, info]) => (info.name === currencyText));
            if (matchingCurrencyInfo) {
                const [currEnumKey, _] = matchingCurrencyInfo;
                const currObj = Currency[currEnumKey];
                newPrices[currObj] = price || -1;
            }
        }
        priceCache = {
            prices: newPrices,
            lastUpdated: Date.now(),
        };
        persistCurrencyPriceCache();
        console.log('Updated price cache:', priceCache);
    }
    catch (error) {
        console.error('Error updating currency prices:', error);
    }
}
/**
 * Get the cached price for a specific currency
 * @param currency The Currency enum value to look up
 * @returns The cached price, or 0 if not available
 */
export function getCurrencyPrice(currency) {
    return priceCache.prices[currency] || 0;
}
/**
 * Get the current price cache state
 * @returns The current price cache object
 */
export function getPriceCache() {
    return priceCache;
}
/**
 * Get the POESESSID from local storage
 * @returns Promise resolving to the POESESSID or empty string if not set
 */
export async function getPoeSessId() {
    return new Promise((resolve) => {
        chrome.storage.local.get('poeSessId', (data) => {
            resolve(data.poeSessId || '');
        });
    });
}
