const DEFAULT_PRIMARY_STORE_URL = 'https://thekashmirweaver.in';

/** Hostnames that 301 to the primary storefront origin (same path + query). */
const REDIRECT_TO_PRIMARY_HOSTS = new Set([
  'thekashmirweaver.shop',
  'www.thekashmirweaver.shop',
  'www.thekashmirweaver.in',
]);

const OXYGEN_PREVIEW_HOST = /\.o2\.myshopify\.dev$/i;

function resolvePrimaryOrigin(primaryStoreUrl?: string): string | null {
  const raw = (primaryStoreUrl ?? DEFAULT_PRIMARY_STORE_URL).trim().replace(/\/$/, '');
  if (!raw) return null;
  try {
    const origin = new URL(raw).origin;
    if (OXYGEN_PREVIEW_HOST.test(new URL(origin).hostname)) {
      return new URL(DEFAULT_PRIMARY_STORE_URL).origin;
    }
    return origin;
  } catch {
    return null;
  }
}

/** 301 non-primary storefront hostnames before React Router handles the request. */
export function redirectNonPrimaryStoreHost(
  request: Request,
  primaryStoreUrl?: string,
): Response | null {
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  const primaryOrigin = resolvePrimaryOrigin(primaryStoreUrl);
  if (!primaryOrigin) return null;

  const primaryHost = new URL(primaryOrigin).hostname.toLowerCase();
  if (hostname === primaryHost) return null;
  if (!REDIRECT_TO_PRIMARY_HOSTS.has(hostname)) return null;

  const target = new URL(`${url.pathname}${url.search}`, primaryOrigin);
  return Response.redirect(target.toString(), 301);
}
