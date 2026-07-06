import type {HydrogenSession, I18nBase} from '@shopify/hydrogen';

const DEFAULT_I18N: I18nBase = {language: 'EN', country: 'US'};
const SESSION_COUNTRY_KEY = 'buyerMarketCountry';
const SESSION_LANGUAGE_KEY = 'buyerLanguage';
const SESSION_CURRENCY_KEY = 'buyerMarketCurrency';

function isCountryCode(value: string): value is I18nBase['country'] {
  return /^[A-Z]{2}$/.test(value);
}

function isLanguageCode(value: string): value is I18nBase['language'] {
  return /^[A-Z]{2}$/.test(value);
}

function persistI18n(session: HydrogenSession | undefined, i18n: I18nBase) {
  session?.set(SESSION_COUNTRY_KEY, i18n.country);
  session?.set(SESSION_LANGUAGE_KEY, i18n.language);
}

export function getPersistedMarketCurrency(
  session: HydrogenSession | undefined,
): string | null {
  const code = session?.get(SESSION_CURRENCY_KEY)?.trim();
  return code || null;
}

/** Persist buyer market in session (survives refresh without `?country=` in URL). */
export function persistBuyerMarket(
  session: HydrogenSession | undefined,
  country: string,
  language?: string,
  currencyCode?: string,
) {
  const normalizedCountry = country.toUpperCase();
  if (!isCountryCode(normalizedCountry)) return;

  persistI18n(session, {
    country: normalizedCountry,
    language:
      language && isLanguageCode(language.toUpperCase())
        ? (language.toUpperCase() as I18nBase['language'])
        : DEFAULT_I18N.language,
  });

  const normalizedCurrency = currencyCode?.trim().toUpperCase();
  if (normalizedCurrency) {
    session?.set(SESSION_CURRENCY_KEY, normalizedCurrency);
  }
}

/**
 * Resolve buyer locale for Storefront API `@inContext(country, language)`.
 * Priority: URL `?country=` (when aligned with session) → session → default US/EN.
 *
 * Browser Accept-Language is intentionally ignored for market/country so the
 * storefront always opens in USD unless the buyer chooses another currency.
 */
export function getI18nFromRequest(
  request: Request,
  session?: HydrogenSession,
): I18nBase {
  const url = new URL(request.url);
  const countryParam = url.searchParams.get('country')?.toUpperCase();
  const languageParam =
    url.searchParams.get('language')?.toUpperCase() ??
    url.searchParams.get('locale')?.split('-')[0]?.toUpperCase();

  if (countryParam && isCountryCode(countryParam)) {
    const sessionCurrency = getPersistedMarketCurrency(session);
    const sessionCountry = session?.get(SESSION_COUNTRY_KEY)?.toUpperCase();
    const urlDiffersFromSession =
      sessionCurrency &&
      sessionCountry &&
      isCountryCode(sessionCountry) &&
      sessionCountry !== countryParam;

    if (!urlDiffersFromSession) {
      const i18n: I18nBase = {
        country: countryParam,
        language:
          languageParam && isLanguageCode(languageParam)
            ? languageParam
            : DEFAULT_I18N.language,
      };
      persistBuyerMarket(session, i18n.country, i18n.language);
      return i18n;
    }
  }

  const sessionCountry = session?.get(SESSION_COUNTRY_KEY)?.toUpperCase();
  const sessionLanguage = session?.get(SESSION_LANGUAGE_KEY)?.toUpperCase();
  if (sessionCountry && isCountryCode(sessionCountry)) {
    const i18n: I18nBase = {
      country: sessionCountry,
      language:
        sessionLanguage && isLanguageCode(sessionLanguage)
          ? sessionLanguage
          : DEFAULT_I18N.language,
    };
    persistBuyerMarket(
      session,
      i18n.country,
      i18n.language,
      session?.get(SESSION_CURRENCY_KEY) ?? undefined,
    );
    return i18n;
  }

  if (countryParam && isCountryCode(countryParam)) {
    const i18n: I18nBase = {
      country: countryParam,
      language:
        languageParam && isLanguageCode(languageParam)
          ? languageParam
          : DEFAULT_I18N.language,
    };
    persistBuyerMarket(session, i18n.country, i18n.language);
    return i18n;
  }

  return DEFAULT_I18N;
}
