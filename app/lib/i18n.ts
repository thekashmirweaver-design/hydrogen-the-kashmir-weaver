import type {I18nBase} from '@shopify/hydrogen';

const DEFAULT_I18N: I18nBase = {language: 'EN', country: 'US'};

/**
 * Resolve locale from URL search params or Accept-Language header.
 * Supports `?country=US&language=EN` (or `locale=en-US`).
 */
export function getI18nFromRequest(request: Request): I18nBase {
  const url = new URL(request.url);
  const countryParam = url.searchParams.get('country')?.toUpperCase();
  const languageParam =
    url.searchParams.get('language')?.toUpperCase() ??
    url.searchParams.get('locale')?.split('-')[0]?.toUpperCase();

  if (countryParam && languageParam) {
    return {
      country: countryParam as I18nBase['country'],
      language: languageParam as I18nBase['language'],
    };
  }

  if (countryParam) {
    return {
      country: countryParam as I18nBase['country'],
      language: DEFAULT_I18N.language,
    };
  }

  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const primary = acceptLanguage.split(',')[0]?.trim();
    const parts = primary?.split('-');
    const language = parts?.[0]?.toUpperCase();
    const country = parts?.[1]?.toUpperCase();

    // curl and some clients send `Accept-Language: *` which is not a valid LanguageCode
    if (language && language !== '*') {
      return {
        language: language as I18nBase['language'],
        country: (country ?? DEFAULT_I18N.country) as I18nBase['country'],
      };
    }
  }

  return DEFAULT_I18N;
}
