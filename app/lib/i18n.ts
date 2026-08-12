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

  const nextLanguage: I18nBase['language'] =
    language && isLanguageCode(language.toUpperCase())
      ? (language.toUpperCase() as I18nBase['language'])
      : DEFAULT_I18N.language;

  // Avoid dirtying the session (Set-Cookie → Oxygen FPC uncacheable) when
  // market values are already stored.
  const countryChanged =
    session?.get(SESSION_COUNTRY_KEY) !== normalizedCountry;
  const languageChanged = session?.get(SESSION_LANGUAGE_KEY) !== nextLanguage;
  if (countryChanged || languageChanged) {
    persistI18n(session, {
      country: normalizedCountry,
      language: nextLanguage,
    });
  }

  const normalizedCurrency = currencyCode?.trim().toUpperCase();
  if (
    normalizedCurrency &&
    session?.get(SESSION_CURRENCY_KEY) !== normalizedCurrency
  ) {
    session?.set(SESSION_CURRENCY_KEY, normalizedCurrency);
  }
}

/**
 * Resolve buyer locale for Storefront API `@inContext(country, language)`.
 * Priority: URL `?country=` (one-shot deep link) → session → default US/EN.
 *
 * Everyday browsing uses session only; the client strips `?country=` after
 * apply so the param does not linger on shareable/canonical URLs.
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

  // Deep link / campaign: `?country=` wins once, then session owns the market.
  if (countryParam && isCountryCode(countryParam)) {
    // Clear stored currency on explicit market deep-link so the destination
    // country's native currency can win (even if country was already set).
    session?.unset(SESSION_CURRENCY_KEY);
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

  return DEFAULT_I18N;
}
