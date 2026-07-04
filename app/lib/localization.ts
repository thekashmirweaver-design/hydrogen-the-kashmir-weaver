import type {Storefront} from '@shopify/hydrogen';
import type {CountryCode} from '@shopify/hydrogen/storefront-api-types';

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
  query Localization($language: LanguageCode)
  @inContext(language: $language) {
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
    if (!countryCode || !code || byCode.has(code)) continue;

    byCode.set(code, {
      code,
      symbol: currency?.symbol?.trim() || code,
      name: currency?.name?.trim() || code,
      countryCode: countryCode as CountryCode,
    });
  }

  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));
}

function resolveSelectedCurrency(
  currencies: ShopCurrencyOption[],
  selectedCountry: CountryCode,
): ShopCurrencyOption {
  const byCountry = currencies.find((c) => c.countryCode === selectedCountry);
  if (byCountry) return byCountry;

  return currencies[0] ?? FALLBACK_CURRENCY;
}

export async function loadLocalization(
  storefront: Storefront,
): Promise<LocalizationSnapshot> {
  const selectedCountry = storefront.i18n.country;

  try {
    const data = await storefront.query<LocalizationQueryResult>(
      LOCALIZATION_QUERY,
      {
        cache: storefront.CacheLong(),
      },
    );

    const currencies = buildCurrencyOptions(data.localization?.availableCountries);
    if (currencies.length) {
      return {
        currencies,
        selectedCountry,
        selectedCurrency: resolveSelectedCurrency(currencies, selectedCountry),
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
