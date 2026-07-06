import type {Storefront} from '@shopify/hydrogen';
import type {CountryCode} from '@shopify/hydrogen/storefront-api-types';
import type {HydrogenSession} from '@shopify/hydrogen';
import {getPersistedMarketCurrency} from '~/lib/i18n';

export type ShopCurrencyOption = {
  code: string;
  symbol: string;
  name: string;
  /** Representative market country for `@inContext` and checkout. */
  countryCode: CountryCode;
};

export type LocalizationSnapshot = {
  currencies: ShopCurrencyOption[];
  selectedCountry: CountryCode;
  selectedCurrency: ShopCurrencyOption;
};

const LOCALIZATION_QUERY = `#graphql
  query Localization($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    localization {
      availableCountries {
        isoCode
        name
        currency {
          isoCode
          name
          symbol
        }
      }
      country {
        isoCode
        currency {
          isoCode
          name
          symbol
        }
      }
    }
  }
` as const;

type LocalizationQueryResult = {
  localization?: {
    availableCountries?: Array<{
      isoCode?: string | null;
      name?: string | null;
      currency?: {
        isoCode?: string | null;
        name?: string | null;
        symbol?: string | null;
      } | null;
    } | null> | null;
    country?: {
      isoCode?: string | null;
      currency?: {
        isoCode?: string | null;
        name?: string | null;
        symbol?: string | null;
      } | null;
    } | null;
  } | null;
};

const FALLBACK_CURRENCY: ShopCurrencyOption = {
  code: 'USD',
  symbol: '$',
  name: 'US Dollar',
  countryCode: 'US',
};

/** Primary Shopify market country per currency (avoids USD → AO on checkout). */
const PREFERRED_COUNTRY_FOR_CURRENCY: Partial<Record<string, CountryCode>> = {
  USD: 'US',
  GBP: 'GB',
  INR: 'IN',
  AUD: 'AU',
  CAD: 'CA',
  EUR: 'DE',
  AED: 'AE',
  SGD: 'SG',
  JPY: 'JP',
};

type AvailableCountry = {
  isoCode?: string | null;
  name?: string | null;
  currency?: {
    isoCode?: string | null;
    name?: string | null;
    symbol?: string | null;
  } | null;
};

export function buildCurrencyOptions(
  countries: Array<AvailableCountry | null> | null | undefined,
): ShopCurrencyOption[] {
  const byCode = new Map<string, ShopCurrencyOption>();

  for (const country of countries ?? []) {
    const countryCode = country?.isoCode?.trim();
    const currency = country?.currency;
    const code = currency?.isoCode?.trim();
    if (!countryCode || !code) continue;

    const preferred = PREFERRED_COUNTRY_FOR_CURRENCY[code];
    const existing = byCode.get(code);
    const option: ShopCurrencyOption = {
      code,
      symbol: currency?.symbol?.trim() || code,
      name: currency?.name?.trim() || code,
      countryCode: countryCode as CountryCode,
    };

    if (!existing) {
      byCode.set(code, option);
      continue;
    }

    if (preferred === countryCode) {
      byCode.set(code, option);
    }
  }

  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));
}

function resolveSelectedCurrency(
  currencies: ShopCurrencyOption[],
  selectedCountry: CountryCode,
  apiCurrencyCode?: string | null,
  sessionCurrencyCode?: string | null,
): ShopCurrencyOption {
  const fromSession = sessionCurrencyCode?.trim().toUpperCase();
  if (fromSession) {
    const bySession = currencies.find((c) => c.code === fromSession);
    if (bySession) return bySession;
  }

  const byCountry = currencies.find((c) => c.countryCode === selectedCountry);
  if (byCountry) return byCountry;

  const normalizedApiCurrency = apiCurrencyCode?.trim();
  if (normalizedApiCurrency) {
    const byApiCurrency = currencies.find((c) => c.code === normalizedApiCurrency);
    if (byApiCurrency) return byApiCurrency;
  }

  return FALLBACK_CURRENCY;
}

export async function loadLocalization(
  storefront: Storefront,
  session?: HydrogenSession,
): Promise<LocalizationSnapshot> {
  const selectedCountry = storefront.i18n.country;
  const sessionCurrencyCode = getPersistedMarketCurrency(session);

  try {
    const data = await storefront.query<LocalizationQueryResult>(
      LOCALIZATION_QUERY,
      {cache: storefront.CacheNone()},
    );

    const currencies = buildCurrencyOptions(data.localization?.availableCountries);
    const apiCurrencyCode = data.localization?.country?.currency?.isoCode;
    const resolvedCurrency = resolveSelectedCurrency(
      currencies,
      selectedCountry,
      apiCurrencyCode,
      sessionCurrencyCode,
    );

    if (currencies.length) {
      return {
        currencies,
        selectedCountry,
        selectedCurrency: resolvedCurrency,
      };
    }
  } catch {
    // Fall through to default
  }

  return {
    currencies: [FALLBACK_CURRENCY],
    selectedCountry,
    selectedCurrency: FALLBACK_CURRENCY,
  };
}

export function countryForCurrencyCode(
  currencies: ShopCurrencyOption[],
  code: string,
): CountryCode {
  return (
    currencies.find((c) => c.code === code)?.countryCode ??
    currencies[0]?.countryCode ??
    FALLBACK_CURRENCY.countryCode
  );
}
