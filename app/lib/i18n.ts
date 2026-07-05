import type {I18nBase} from '@shopify/hydrogen';
import type {AppSession} from '~/lib/session';

const DEFAULT_I18N: I18nBase = {language: 'EN', country: 'US'};
const SESSION_COUNTRY_KEY = 'buyerMarketCountry';
const SESSION_LANGUAGE_KEY = 'buyerLanguage';

function isCountryCode(value: string): value is I18nBase['country'] {
  return /^[A-Z]{2}$/.test(value);
}

function isLanguageCode(value: string): value is I18nBase['language'] {
  return /^[A-Z]{2}$/.test(value);
}

function persistI18n(session: AppSession | undefined, i18n: I18nBase) {
  session?.set(SESSION_COUNTRY_KEY, i18n.country);
  session?.set(SESSION_LANGUAGE_KEY, i18n.language);
}

/**
 * Resolve buyer locale for Storefront API `@inContext(country, language)`.
 * Priority: URL `?country=` (explicit picker) → session → default US/EN (USD).
 *
 * Browser Accept-Language is intentionally ignored for market/country so the
 * storefront always opens in USD unless the buyer chooses another currency.
 */
export function getI18nFromRequest(
  request: Request,
  session?: AppSession,
): I18nBase {
  const url = new URL(request.url);
  const countryParam = url.searchParams.get('country')?.toUpperCase();
  const languageParam =
    url.searchParams.get('language')?.toUpperCase() ??
    url.searchParams.get('locale')?.split('-')[0]?.toUpperCase();

  if (countryParam && isCountryCode(countryParam)) {
    const i18n: I18nBase = {
      country: countryParam,
      language:
        languageParam && isLanguageCode(languageParam)
          ? languageParam
          : DEFAULT_I18N.language,
    };
    persistI18n(session, i18n);
    return i18n;
  }

  const sessionCountry = session?.get(SESSION_COUNTRY_KEY)?.toUpperCase();
  const sessionLanguage = session?.get(SESSION_LANGUAGE_KEY)?.toUpperCase();
  if (sessionCountry && isCountryCode(sessionCountry)) {
    return {
      country: sessionCountry,
      language:
        sessionLanguage && isLanguageCode(sessionLanguage)
          ? sessionLanguage
          : DEFAULT_I18N.language,
    };
  }

  return DEFAULT_I18N;
}
