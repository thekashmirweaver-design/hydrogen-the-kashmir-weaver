/**
 * Live FX rates for display-only price conversion (checkout stays USD).
 * Browser fetches same-origin `/api/fx-rates` (CSP-safe); the route proxies
 * open.er-api.com / currency-api CDN from the server.
 */

export type FxRates = {
  base: 'USD';
  rates: Record<string, number>;
  fetchedAt: number;
};

const CACHE_MS = 1000 * 60 * 60; // 1 hour
let memoryCache: FxRates | null = null;
let inflight: Promise<FxRates> | null = null;

const FALLBACK_RATES: FxRates = {
  base: 'USD',
  rates: {USD: 1},
  fetchedAt: 0,
};

function isFxRates(value: unknown): value is FxRates {
  if (!value || typeof value !== 'object') return false;
  const v = value as FxRates;
  return v.base === 'USD' && !!v.rates && typeof v.rates.USD === 'number';
}

export async function loadUsdFxRates(): Promise<FxRates> {
  if (memoryCache && Date.now() - memoryCache.fetchedAt < CACHE_MS) {
    return memoryCache;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch('/api/fx-rates', {
        headers: {Accept: 'application/json'},
      });
      if (res.ok) {
        const data: unknown = await res.json();
        if (isFxRates(data) && Object.keys(data.rates).length > 1) {
          memoryCache = data;
          return data;
        }
      }
    } catch {
      // fall through to cache / fallback
    }
    return memoryCache ?? FALLBACK_RATES;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Convert an amount from `fromCode` into `toCode` using USD-based rates. */
export function convertAmount(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: Record<string, number>,
): number {
  const from = fromCode.toUpperCase();
  const to = toCode.toUpperCase();
  if (!Number.isFinite(amount) || from === to) return amount;

  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return amount;

  // rates are “1 USD = X currency”
  const inUsd = from === 'USD' ? amount : amount / fromRate;
  return to === 'USD' ? inUsd : inUsd * toRate;
}
