/**
 * Shopify Customer Events — Custom Pixel for Meta catalogue ads (Purchase).
 *
 * Why this exists
 * ---------------
 * Hydrogen storefront events (ViewContent / AddToCart / InitiateCheckout) fire
 * from app/components/MetaPixel.tsx on thekashmirweaver.shop.
 * Checkout + thank-you run on Shopify's domain, so Purchase cannot fire from
 * the Hydrogen app. Paste this into Shopify Admin instead.
 *
 * Install
 * -------
 * 1. Shopify Admin → Settings → Customer events → Add custom pixel
 * 2. Name: "Meta Pixel — Purchase (Hydrogen)"
 * 3. Paste this entire file (no <script> tags)
 * 4. Save → Connect
 *
 * Pixel ID must match app/components/MetaPixel.tsx (META_PIXEL_ID).
 * content_ids use numeric Shopify variant IDs (Facebook & Instagram catalogue).
 *
 * If Facebook & Instagram sales channel already sends Purchase for this pixel,
 * keep both — eventID below lets Meta dedupe.
 */

const META_PIXEL_ID = '1724382275473712';

function gidTail(id) {
  if (id == null) return '';
  const raw = String(id);
  const parts = raw.split('/');
  return parts[parts.length - 1] || raw;
}

function lineVariantId(line) {
  return (
    gidTail(line?.variant?.id) ||
    gidTail(line?.merchandise?.id) ||
    ''
  );
}

function checkoutToMeta(checkout) {
  const lines = checkout?.lineItems || [];
  const contents = [];
  const content_ids = [];

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

  const value = Number(
    checkout?.totalPrice?.amount ?? checkout?.subtotalPrice?.amount ?? 0,
  );
  const currency =
    checkout?.currencyCode ||
    checkout?.totalPrice?.currencyCode ||
    checkout?.subtotalPrice?.currencyCode ||
    'USD';

  return {
    content_ids,
    content_type: 'product',
    contents,
    num_items: contents.reduce((sum, row) => sum + (row.quantity || 0), 0),
    value: Number.isFinite(value) ? value : 0,
    currency,
  };
}

// Official Meta Pixel stub for Shopify's custom-pixel sandbox.
!(function (f, b, e, v, n, t, s) {
  if (f.fbq) return;
  n = f.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  t = b.createElement(e);
  t.async = true;
  t.src = v;
  s = b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t, s);
})(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

fbq('init', META_PIXEL_ID);

analytics.subscribe('checkout_completed', (event) => {
  const checkout = event?.data?.checkout;
  if (!checkout) return;

  const params = checkoutToMeta(checkout);
  if (!params.content_ids.length) return;

  const orderId =
    gidTail(checkout.order?.id) ||
    gidTail(checkout.token) ||
    String(event?.id || '');

  fbq(
    'track',
    'Purchase',
    params,
    orderId ? {eventID: 'purchase_' + orderId} : undefined,
  );
});
