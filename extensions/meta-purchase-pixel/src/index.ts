import {register} from '@shopify/web-pixels-extension';

/**
 * Checkout-domain Meta Purchase for Hydrogen catalogue ads.
 * Storefront ATC/ViewContent fire from app/components/MetaPixel.tsx.
 * content_ids = numeric Shopify variant IDs (Facebook & Instagram catalogue).
 */
register(({analytics, settings}) => {
  const pixelID = String(settings.pixelID || '').trim();
  if (!pixelID) return;

  const gidTail = (id) => {
    if (id == null) return '';
    const raw = String(id);
    const parts = raw.split('/');
    return parts[parts.length - 1] || raw;
  };

  const lineVariantId = (line) =>
    gidTail(line?.variant?.id) || gidTail(line?.merchandise?.id) || '';

  const sendPurchase = (checkout, eventId) => {
    const lines = checkout?.lineItems || [];
    const content_ids = [];
    const contents = [];

    for (const line of lines) {
      const id = lineVariantId(line);
      if (!id) continue;
      const quantity = line.quantity || 1;
      const lineTotal = Number(
        line.finalLinePrice?.amount ??
          line.totalPrice?.amount ??
          line.variant?.price?.amount ??
          0,
      );
      content_ids.push(id);
      contents.push({
        id,
        quantity,
        item_price: Number.isFinite(lineTotal) ? lineTotal / quantity : undefined,
      });
    }

    if (!content_ids.length) return;

    const value = Number(
      checkout?.totalPrice?.amount ?? checkout?.subtotalPrice?.amount ?? 0,
    );
    const currency =
      checkout?.currencyCode ||
      checkout?.totalPrice?.currencyCode ||
      checkout?.subtotalPrice?.currencyCode ||
      'USD';

    const params = new URLSearchParams({
      id: pixelID,
      ev: 'Purchase',
      noscript: '1',
      'cd[content_type]': 'product',
      'cd[currency]': currency,
      'cd[value]': String(Number.isFinite(value) ? value : 0),
      'cd[content_ids]': JSON.stringify(content_ids),
      'cd[contents]': JSON.stringify(contents),
      'cd[num_items]': String(
        contents.reduce((sum, row) => sum + (row.quantity || 0), 0),
      ),
    });
    if (eventId) params.set('eid', eventId);

    // Image-pixel beacon — works in the strict web-pixel sandbox without a CAPI token.
    fetch(`https://www.facebook.com/tr/?${params.toString()}`, {
      method: 'GET',
      keepalive: true,
      mode: 'no-cors',
    }).catch(() => {});
  };

  analytics.subscribe('checkout_completed', (event) => {
    const checkout = event?.data?.checkout;
    if (!checkout) return;
    const orderId =
      gidTail(checkout.order?.id) ||
      gidTail(checkout.token) ||
      String(event?.id || '');
    sendPurchase(checkout, orderId ? `purchase_${orderId}` : undefined);
  });
});
