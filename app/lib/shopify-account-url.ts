/** Shopify-hosted new customer account paths (same UI as checkout/login OAuth). */
export type ShopifyHostedAccountPage =
  | 'orders'
  | 'profile'
  | 'addresses';

export function shopifyHostedAccountUrl(
  shopId: string,
  page: ShopifyHostedAccountPage = 'orders',
): string {
  return `https://shopify.com/${shopId}/account/${page}`;
}

export function shopifyHostedOrderUrl(
  shopId: string,
  orderRouteParam: string,
): string {
  const orderId = decodeOrderRouteParam(orderRouteParam);
  return `https://shopify.com/${shopId}/account/orders/${orderId}`;
}

/** Route param is base64-encoded order GID from legacy Hydrogen links. */
export function decodeOrderRouteParam(param: string): string {
  try {
    const gid = atob(param);
    const match = gid.match(/\/(\d+)$/);
    if (match?.[1]) return match[1];
  } catch {
    // Fall through — use param as-is (already numeric).
  }
  return param;
}
