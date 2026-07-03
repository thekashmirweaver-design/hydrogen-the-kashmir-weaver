/** Format Shopify cart/API money without client-side currency conversion. */
export function formatShopifyMoney(amount: string | number, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(typeof amount === 'string' ? Number(amount) : amount);
}
