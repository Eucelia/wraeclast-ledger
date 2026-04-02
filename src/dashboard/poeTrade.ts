const TRADE_HOST = 'https://www.pathofexile.com';
const TESTING_POESSID = '3669d0d8b39d1a0ce9c99fdf7fed3ffe';

// Simple in-memory cache per-session, keyed by trade URL.
// We ignore sessionId differences for now; if the URL and POE filters
// are the same, results are usually "good enough" for a quick cache.
const ONE_HOUR_MS = 60 * 60 * 1000;

interface CachedPrices {
  prices: PriceListing[];
  lastUpdated: number;
}

const priceCache = new Map<string, CachedPrices>();

export interface PriceListing {
  amount: number;
  currency: string;
  whisper: string | null;
  id: string;
  goldFee?: number;
  hideoutToken?: string;
  imageUrl?: string;
  lastUpdated: number;
}

interface PoeTradeSearchResponse {
  id: string;
  result: string[];
  total: number;
  error?: { code?: number | string; message?: string };
}

interface PoeTradeFetchResponse {
  result: Array<{
    id: string;
    listing: {
      price?: {
        amount: number;
        currency: string;
      };
      whisper?: string;
      // Additional fields exist on PoE2 trade listings; we treat them as indexable.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    };
    item: {
      // Trade API includes an icon URL for the item
      icon?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    };
  }>;
}

function parseTradeSearchUrl(url: string): {
  realm: string | null;
  league: string;
  queryId: string;
} {
  const match = url.match(/\/trade2\/search\/(.+)$/);
  if (!match) {
    throw new Error('Invalid trade search URL');
  }
  const parts = match[1].split('/').filter(Boolean);
  if (parts.length < 2 || parts.length > 3) {
    throw new Error('Invalid trade search URL path');
  }

  let realm: string | null = null;
  let league: string;
  let queryId: string;

  if (parts.length === 3) {
    [realm, league, queryId] = parts;
  } else {
    [league, queryId] = parts;
  }

  return { realm, league, queryId };
}

function buildSearchApiUrl(
  realm: string | null,
  league: string,
  queryId?: string,
): string {
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

async function fetchSearchQuery(
  realm: string | null,
  league: string,
  queryId: string,
  sessionId?: string,
): Promise<string> {
  const url = buildSearchApiUrl(realm, league, queryId);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionId) {
    headers.Cookie = `POESESSID=${sessionId}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch search query: HTTP ${res.status}`);
  }
  return res.text();
}

async function performSearch(
  realm: string | null,
  league: string,
  queryJson: string,
  sessionId?: string,
): Promise<PoeTradeSearchResponse> {
  const url = buildSearchApiUrl(realm, league);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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

  const parsed = JSON.parse(text) as PoeTradeSearchResponse;
  if (!parsed.result || parsed.result.length === 0) {
    if (parsed.error?.message) {
      throw new Error(parsed.error.message);
    }
    throw new Error('No matching results found');
  }

  return parsed;
}

async function fetchResults(
  itemHashes: string[],
  queryId: string,
  maxCount: number,
  sessionId?: string,
): Promise<PriceListing[]> {
  const quantityFound = Math.min(itemHashes.length, maxCount);
  const maxBlockSize = 10;
  const results: PriceListing[] = [];
  const headers: Record<string, string> = {};
  if (sessionId) {
    headers.Cookie = `POESESSID=${sessionId}`;
  }

  for (let start = 0; start < quantityFound; start += maxBlockSize) {
    const end = Math.min(start + maxBlockSize, quantityFound);
    const block = itemHashes.slice(start, end);
    const paramHashes = block.join(',');
    const url = `${TRADE_HOST}/api/trade2/fetch/${paramHashes}?query=${encodeURIComponent(
      queryId,
    )}`;

    const res = await fetch(url, { headers });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Fetch failed: HTTP ${res.status} – ${text}`);
    }

    const parsed = JSON.parse(text) as PoeTradeFetchResponse;
    if (!parsed.result) {
      throw new Error('Invalid fetch response (missing result)');
    }

    for (const tradeEntry of parsed.result) {
      const listing = tradeEntry.listing as any;
      const item = tradeEntry.item as any;
      const price = listing.price;
      if (!price) continue;
      const goldFee =
        typeof listing.gold_fee === 'number'
          ? listing.gold_fee
          : typeof listing.goldFee === 'number'
          ? listing.goldFee
          : listing.fee && typeof listing.fee.gold === 'number'
          ? listing.fee.gold
          : undefined;
      const hideoutToken =
        typeof listing.hideout_token === 'string'
          ? listing.hideout_token
          : typeof listing.hideoutToken === 'string'
          ? listing.hideoutToken
          : undefined;
      const imageUrl =
        item && typeof item.icon === 'string'
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
      if (results.length >= quantityFound) break;
    }

    if (results.length >= quantityFound) {
      break;
    }
  }

  results.sort((a, b) => a.amount - b.amount);

  return results;
}

export async function getFirstPagePricesFromUrl(
  tradeUrl: string,
  options?: {
    maxPerPage?: number;
    sessionId?: string;
  },
): Promise<PriceListing[]> {
  const cached = priceCache.get(tradeUrl);
  const now = Date.now();
  if (cached && now - cached.lastUpdated < ONE_HOUR_MS) {
    return cached.prices;
  }

  const { realm, league, queryId } = parseTradeSearchUrl(tradeUrl);
  const maxPerPage = options?.maxPerPage ?? 10;

  const rawQuery = await fetchSearchQuery(realm, league, queryId, options?.sessionId);
  const queryObj = JSON.parse(rawQuery);

  if (!queryObj.sort) {
    queryObj.sort = {};
  }
  queryObj.sort.price = 'asc';

  const updatedQueryJson = JSON.stringify(queryObj);

  const searchResponse = await performSearch(
    realm,
    league,
    updatedQueryJson,
    options?.sessionId,
  );

  const prices = await fetchResults(
    searchResponse.result,
    searchResponse.id,
    maxPerPage,
    options?.sessionId,
  );
  const withTimestamps = prices.map((p) => ({ ...p, lastUpdated: now }));

  priceCache.set(tradeUrl, { prices: withTimestamps, lastUpdated: now });

  return withTimestamps;
}

export function isTradeUrlFresh(tradeUrl: string, maxAgeMs: number): boolean {
  const cached = priceCache.get(tradeUrl);
  if (!cached) return false;
  const now = Date.now();
  return now - cached.lastUpdated <= maxAgeMs;
}

export function clearTradeCache(): void {
  priceCache.clear();
}

export function getCachedCheapestPrice(
  tradeUrl: string,
  convertToReference: (currency: string, amount: number) => number | null,
): number | null {
  const cached = priceCache.get(tradeUrl);
  if (!cached || !cached.prices.length) return null;

  let min: number | null = null;
  for (const entry of cached.prices) {
    const refValue = convertToReference(entry.currency, entry.amount);
    if (refValue == null) continue;
    if (min === null || refValue < min) {
      min = refValue;
    }
  }
  return min;
}
