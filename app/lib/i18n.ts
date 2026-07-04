import type {I18nBase} from '@shopify/hydrogen';
import type {AppSession} from '~/lib/session';

const DEFAULT_I18N: I18nBase = {language: 'EN', country: 'US'};
const SESSION_COUNTRY_KEY = 'buyerCountry';
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
 * Priority: URL params → session → Accept-Language → default (US/EN).
 *
 * Hydrogen injects the result into every storefront.query that declares
 * `$country` / `$language` with `@inContext`.
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

  if (languageParam && isLanguageCode(languageParam)) {
    const i18n: I18nBase = {
      country: DEFAULT_I18N.country,
      language: languageParam,
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

  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const primary = acceptLanguage.split(',')[0]?.trim();
    const parts = primary?.split('-');
    const language = parts?.[0]?.toUpperCase();
    const country = parts?.[1]?.toUpperCase();

    // curl and some clients send `Accept-Language: *` which is not a valid LanguageCode
    if (language && language !== '*' && isLanguageCode(language)) {
      const i18n: I18nBase = {
        language,
        country:
          country && isCountryCode(country)
            ? country
            : DEFAULT_I18N.country,
      };
      persistI18n(session, i18n);
      return i18n;
    }
  }

  return DEFAULT_I18N;
}
