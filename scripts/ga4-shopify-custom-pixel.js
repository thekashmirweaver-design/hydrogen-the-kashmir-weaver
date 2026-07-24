/**
 * Shopify Customer Events — Custom Pixel for GA4 ecommerce (Purchase).
 *
 * Why this exists
 * ---------------
 * Hydrogen storefront events (view_item / add_to_cart / begin_checkout) fire
 * from app/components/GoogleAnalytics.tsx on thekashmirweaver.shop.
 * Checkout + thank-you run on Shopify's domain, so purchase cannot fire from
 * the Hydrogen app. Paste this into Shopify Admin instead.
 *
 * Install
 * -------
 * 1. Shopify Admin → Settings → Customer events → Add custom pixel
 * 2. Name: "GA4 — Purchase (Hydrogen)"
 * 3. Paste this entire file (no <script> tags)
 * 4. Save → Connect
 *
 * Measurement ID must match app/components/GoogleAnalytics.tsx (GA_MEASUREMENT_ID).
 * item_id uses numeric Shopify variant IDs (same as storefront GA items).
 */

const GA_MEASUREMENT_ID = 'G-2WQQF2JKTQ';

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

function checkoutToGa(checkout) {
  const lines = checkout?.lineItems || [];
  const items = [];

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
    items.push({
      item_id: id,
      item_name: line.title || line.variant?.title || 'Product',
      item_variant: line.variant?.title,
      price: Number.isFinite(lineTotal) ? lineTotal / quantity : undefined,
      quantity,
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

  const transaction_id =
    gidTail(checkout?.order?.id) ||
    gidTail(checkout?.token) ||
    undefined;

  return {
    transaction_id,
    currency,
    value: Number.isFinite(value) ? value : 0,
    items,
  };
}

// gtag.js stub for Shopify's custom-pixel sandbox.
window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}
gtag('js', new Date());
gtag('config', GA_MEASUREMENT_ID, {send_page_view: false});

const gtagScript = document.createElement('script');
gtagScript.async = true;
gtagScript.src =
  'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
document.head.appendChild(gtagScript);

analytics.subscribe('checkout_completed', (event) => {
  const checkout = event?.data?.checkout;
  if (!checkout) return;

  const params = checkoutToGa(checkout);
  if (!params.items.length) return;

  gtag('event', 'purchase', params);
});

analytics.subscribe('payment_info_submitted', (event) => {
  const checkout = event?.data?.checkout;
  if (!checkout) return;

  const params = checkoutToGa(checkout);
  if (!params.items.length) return;

  gtag('event', 'add_payment_info', {
    currency: params.currency,
    value: params.value,
    items: params.items,
  });
});
