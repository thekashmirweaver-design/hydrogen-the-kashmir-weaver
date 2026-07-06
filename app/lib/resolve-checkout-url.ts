import type {CartApiQueryFragment} from 'storefrontapi.generated';

/**
 * Normalize Storefront API checkout URLs for headless Hydrogen stores.
 *
 * - Rewrites Oxygen preview hostnames to PUBLIC_CHECKOUT_DOMAIN (myshopify.com)
 * - Strips `_cs` (Hydrogen/AMPS) which otherwise redirects to /cart/c/ on Oxygen → 404
 * - Maps /cart/c/:token handoff URLs to /checkouts/cn/:token/:locale
 */
const OXYGEN_PREVIEW_HOST = /\.o2\.myshopify\.dev$/i;

export function resolveCheckoutUrl(
  checkoutUrl: string,
  checkoutDomain?: string | null,
): string {
  if (!checkoutUrl) return checkoutUrl;

  try {
    const url = new URL(checkoutUrl);
    const host = checkoutHost(checkoutDomain);

    if (host) {
      url.hostname = host;
    } else if (OXYGEN_PREVIEW_HOST.test(url.hostname)) {
      // PUBLIC_CHECKOUT_DOMAIN must be set to rewrite Oxygen preview checkout hosts.
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
  storefrontUrl?: string | null,
): string {
  const normalized = resolveCheckoutUrl(checkoutUrl, checkoutDomain);

  try {
    const url = new URL(normalized);
    const tokenMatch = url.pathname.match(/\/cart\/c\/([^/]+)/);
    const host = checkoutHost(checkoutDomain) ?? url.hostname;
    const checkout = tokenMatch?.[1]
      ? new URL(`https://${host}/checkouts/cn/${tokenMatch[1]}/${locale}`)
      : new URL(normalized);

    url.searchParams.forEach((value, key) => {
      if (key !== '_cs') checkout.searchParams.set(key, value);
    });

    appendStorefrontReturnUrl(checkout, storefrontUrl);

    return checkout.toString();
  } catch {
    return normalized;
  }
}

/** Hint Shopify checkout thank-you "Continue shopping" toward the live storefront. */
function appendStorefrontReturnUrl(
  checkout: URL,
  storefrontUrl?: string | null,
): void {
  const origin = normalizeStorefrontOrigin(storefrontUrl);
  if (!origin) return;
  if (!checkout.searchParams.has('return_url')) {
    checkout.searchParams.set('return_url', origin);
  }
}

function normalizeStorefrontOrigin(storefrontUrl?: string | null): string | null {
  if (!storefrontUrl?.trim()) return null;
  try {
    return new URL(storefrontUrl.trim()).origin;
  } catch {
    return null;
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

/** Apply storefront checkout URL normalization to a cart fragment (server or client). */
export function cartWithStorefrontCheckoutUrl(
  cart: CartApiQueryFragment | null | undefined,
  checkoutDomain: string | null | undefined,
  locale: string,
  storefrontUrl?: string | null,
): CartApiQueryFragment | null {
  if (!cart?.checkoutUrl) return cart ?? null;
  return {
    ...cart,
    checkoutUrl: toStorefrontCheckoutUrl(
      cart.checkoutUrl,
      checkoutDomain,
      locale,
      storefrontUrl,
    ),
  };
}
