const TRADE_HOST = 'https://www.pathofexile.com';
const TESTING_POESSID = '3669d0d8b39d1a0ce9c99fdf7fed3ffe';
// Simple in-memory cache per-session, keyed by trade URL.
// We ignore sessionId differences for now; if the URL and POE filters
// are the same, results are usually "good enough" for a quick cache.
const ONE_HOUR_MS = 60 * 60 * 1000;
const priceCache = new Map();
function parseTradeSearchUrl(url) {
    const match = url.match(/\/trade2\/search\/(.+)$/);
    if (!match) {
        throw new Error('Invalid trade search URL');
    }
    const parts = match[1].split('/').filter(Boolean);
    if (parts.length < 2 || parts.length > 3) {
        throw new Error('Invalid trade search URL path');
    }
    let realm = null;
    let league;
    let queryId;
    if (parts.length === 3) {
        [realm, league, queryId] = parts;
    }
    else {
        [league, queryId] = parts;
    }
    return { realm, league, queryId };
}
function buildSearchApiUrl(realm, league, queryId) {
    let base = `${TRADE_HOST}/api/trade2/search`;
    if (realm && realm !== 'pc') {
        base += `/${encodeURIComponent(realm)}`;
    }
    const encodedLeague = encodeURIComponent(league).replace(/%20/g, '+');
    base += `/${encodedLeague}`;
    if (queryId) {
        base += `/${queryId}`;
    }
    return base;
}
async function fetchSearchQuery(realm, league, queryId, sessionId) {
    const url = buildSearchApiUrl(realm, league, queryId);
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) {
        headers.Cookie = `POESESSID=${sessionId}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
        throw new Error(`Failed to fetch search query: HTTP ${res.status}`);
    }
    return res.text();
}
async function performSearch(realm, league, queryJson, sessionId) {
    const url = buildSearchApiUrl(realm, league);
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) {
        headers.Cookie = `POESESSID=${sessionId}`;
    }
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: queryJson,
    });
    const text = await res.text();
    if (!res.ok) {
        throw new Error(`Search failed: HTTP ${res.status} – ${text}`);
    }
    const parsed = JSON.parse(text);
    if (!parsed.result || parsed.result.length === 0) {
        if (parsed.error?.message) {
            throw new Error(parsed.error.message);
        }
        throw new Error('No matching results found');
    }
    return parsed;
}
async function fetchResults(itemHashes, queryId, maxCount, sessionId) {
    const quantityFound = Math.min(itemHashes.length, maxCount);
    const maxBlockSize = 10;
    const results = [];
    const headers = {};
    if (sessionId) {
        headers.Cookie = `POESESSID=${sessionId}`;
    }
    for (let start = 0; start < quantityFound; start += maxBlockSize) {
        const end = Math.min(start + maxBlockSize, quantityFound);
        const block = itemHashes.slice(start, end);
        const paramHashes = block.join(',');
        const url = `${TRADE_HOST}/api/trade2/fetch/${paramHashes}?query=${encodeURIComponent(queryId)}`;
        const res = await fetch(url, { headers });
        const text = await res.text();
        if (!res.ok) {
            throw new Error(`Fetch failed: HTTP ${res.status} – ${text}`);
        }
        const parsed = JSON.parse(text);
        if (!parsed.result) {
            throw new Error('Invalid fetch response (missing result)');
        }
        for (const tradeEntry of parsed.result) {
            const listing = tradeEntry.listing;
            const item = tradeEntry.item;
            const price = listing.price;
            if (!price)
                continue;
            const goldFee = typeof listing.fee === 'number'
                ? listing.fee
                : undefined;
            const hideoutToken = typeof listing.hideoutToken === 'string'
                ? listing.hideoutToken
                : undefined;
            const imageUrl = item && typeof item.icon === 'string'
                ? item.icon
                : undefined;
            results.push({
                amount: price.amount,
                currency: price.currency,
                whisper: listing.whisper ?? null,
                id: tradeEntry.id,
                goldFee,
                hideoutToken,
                imageUrl,
                lastUpdated: 0,
            });
            if (results.length >= quantityFound)
                break;
        }
        if (results.length >= quantityFound) {
            break;
        }
    }
    return results;
}
export async function getFirstPagePricesFromUrl(tradeUrl, options) {
    const cached = priceCache.get(tradeUrl);
    const now = Date.now();
    if (cached && now - cached.lastUpdated < ONE_HOUR_MS) {
        return cached.prices;
    }
    // Log when we fall through to an actual trade site fetch so we can
    // observe how often trade URLs are being queried.
    // eslint-disable-next-line no-console
    console.log('[poe-profit-watch] Fetching trade prices for URL:', tradeUrl);
    const { realm, league, queryId } = parseTradeSearchUrl(tradeUrl);
    const maxPerPage = options?.maxPerPage ?? 10;
    const rawQuery = await fetchSearchQuery(realm, league, queryId, options?.sessionId);
    const queryObj = JSON.parse(rawQuery);
    if (!queryObj.sort) {
        queryObj.sort = {};
    }
    queryObj.sort.price = 'asc';
    const updatedQueryJson = JSON.stringify(queryObj);
    const searchResponse = await performSearch(realm, league, updatedQueryJson, options?.sessionId);
    const prices = await fetchResults(searchResponse.result, searchResponse.id, maxPerPage, options?.sessionId);
    const withTimestamps = prices.map((p) => ({ ...p, lastUpdated: now }));
    priceCache.set(tradeUrl, { prices: withTimestamps, lastUpdated: now });
    return withTimestamps;
}
export function isTradeUrlFresh(tradeUrl, maxAgeMs) {
    const cached = priceCache.get(tradeUrl);
    if (!cached)
        return false;
    const now = Date.now();
    return now - cached.lastUpdated <= maxAgeMs;
}
export function clearTradeCache() {
    priceCache.clear();
}
export function getCachedCheapestPrice(tradeUrl, convertToReference) {
    const cached = priceCache.get(tradeUrl);
    if (!cached || !cached.prices.length)
        return null;
    let minPrice = null;
    let minTransactionCost = null;
    for (const entry of cached.prices) {
        const refValue = convertToReference(entry.currency, entry.amount);
        if (refValue == null)
            continue;
        const transactionCost = typeof entry.goldFee === 'number'
            ? convertToReference('gold', entry.goldFee) // assumes converter knows how to handle gold
            : null;
        if (minPrice === null || refValue < minPrice) {
            minPrice = refValue;
            minTransactionCost = transactionCost;
        }
    }
    if (minPrice === null)
        return null;
    return { price: minPrice, transactionCost: minTransactionCost };
}
