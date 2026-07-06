/**
 * Normalize Storefront API checkout URLs for headless Hydrogen stores.
 *
 * - Rewrites Oxygen preview hostnames to PUBLIC_CHECKOUT_DOMAIN (myshopify.com)
 * - Strips `_cs` (Hydrogen/AMPS) which otherwise redirects to /cart/c/ on Oxygen → 404
 * - Maps /cart/c/:token handoff URLs to /checkouts/cn/:token/:locale
 */
export function resolveCheckoutUrl(
  checkoutUrl: string,
  checkoutDomain?: string | null,
): string {
  if (!checkoutUrl) return checkoutUrl;

  try {
    const url = new URL(checkoutUrl);

    if (checkoutDomain?.trim()) {
      const host = checkoutDomain
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .trim();
      if (host) url.hostname = host;
    }

    url.searchParams.delete('_cs');

    return url.toString();
  } catch {
    return checkoutUrl;
  }
}

function checkoutHost(checkoutDomain?: string | null): string | null {
  if (!checkoutDomain?.trim()) return null;
  return checkoutDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
}

/** e.g. EN + US → en-us */
export function checkoutLocale(language?: string, country?: string): string {
  const lang = (language ?? 'EN').toLowerCase();
  const region = (country ?? 'US').toLowerCase();
  return `${lang}-${region}`;
}

export function toStorefrontCheckoutUrl(
  checkoutUrl: string,
  checkoutDomain?: string | null,
  locale = 'en-us',
): string {
  const normalized = resolveCheckoutUrl(checkoutUrl, checkoutDomain);

  try {
    const url = new URL(normalized);
    const tokenMatch = url.pathname.match(/\/cart\/c\/([^/]+)/);
    if (!tokenMatch?.[1]) return normalized;

    const host = checkoutHost(checkoutDomain) ?? url.hostname;
    const checkout = new URL(
      `https://${host}/checkouts/cn/${tokenMatch[1]}/${locale}`,
    );

    url.searchParams.forEach((value, key) => {
      if (key !== '_cs') checkout.searchParams.set(key, value);
    });

    return checkout.toString();
  } catch {
    return normalized;
  }
}

export function checkoutUrlFromCartToken(
  token: string,
  search: string,
  checkoutDomain: string,
  locale = 'en-us',
): string {
  const host = checkoutHost(checkoutDomain) ?? checkoutDomain;
  const checkout = new URL(`https://${host}/checkouts/cn/${token}/${locale}`);
  const params = new URLSearchParams(search);
  params.delete('_cs');
  params.forEach((value, key) => checkout.searchParams.set(key, value));
  return checkout.toString();
}
