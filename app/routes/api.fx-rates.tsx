import type {Route} from './+types/api.fx-rates';
import type {FxRates} from '~/lib/fx-rates';

async function fetchOpenErApi(): Promise<FxRates | null> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    headers: {Accept: 'application/json'},
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };
  if (data.result !== 'success' || !data.rates) return null;
  return {
    base: 'USD',
    rates: {...data.rates, USD: 1},
    fetchedAt: Date.now(),
  };
}

async function fetchCurrencyApiCdn(): Promise<FxRates | null> {
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json',
    {headers: {Accept: 'application/json'}},
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {usd?: Record<string, number>};
  if (!data.usd) return null;
  const rates: Record<string, number> = {USD: 1};
  for (const [code, rate] of Object.entries(data.usd)) {
    if (typeof rate === 'number' && Number.isFinite(rate)) {
      rates[code.toUpperCase()] = rate;
    }
  }
  return {base: 'USD', rates, fetchedAt: Date.now()};
}

/**
 * Same-origin FX proxy. Browser CSP blocks direct calls to open.er-api.com;
 * the server can fetch rates and return them to the client.
 * Do not use node:fs here — MiniOxygen/Workers has no filesystem.
 */
export async function loader(_args: Route.LoaderArgs) {
  try {
    const primary = await fetchOpenErApi();
    if (primary) {
      return Response.json(primary, {
        headers: {
          'Cache-Control': 'public, max-age=1800',
        },
      });
    }

    const fallback = await fetchCurrencyApiCdn();
    if (fallback) {
      return Response.json(fallback, {
        headers: {
          'Cache-Control': 'public, max-age=1800',
        },
      });
    }
  } catch {
    // fall through to empty rates
  }

  return Response.json(
    {base: 'USD', rates: {USD: 1}, fetchedAt: 0},
    {status: 503, headers: {'Cache-Control': 'no-store'}},
  );
}
