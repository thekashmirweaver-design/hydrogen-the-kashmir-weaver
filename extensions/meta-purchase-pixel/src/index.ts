import {register} from '@shopify/web-pixels-extension';

/**
 * Checkout-domain purchase beacons for Hydrogen:
 * - Meta Purchase (catalogue ads)
 * - GA4 purchase (Analytics)
 *
 * Storefront ATC / ViewContent / begin_checkout fire from
 * app/components/MetaPixel.tsx and GoogleAnalytics.tsx.
 * content_ids / item_id = numeric Shopify variant IDs.
 */
register(({analytics, settings, init, browser}) => {
  const pixelID = String(settings.pixelID || '').trim();
  const gaMeasurementId = String(
    settings.gaMeasurementId || 'G-2WQQF2JKTQ',
  ).trim();

  const gidTail = (id) => {
    if (id == null) return '';
    const raw = String(id);
    const parts = raw.split('/');
    return parts[parts.length - 1] || raw;
  };

  const lineVariantId = (line) =>
    gidTail(line?.variant?.id) || gidTail(line?.merchandise?.id) || '';

  const checkoutCurrency = (checkout) =>
    checkout?.currencyCode ||
    checkout?.totalPrice?.currencyCode ||
    checkout?.subtotalPrice?.currencyCode ||
    'USD';

  const checkoutValue = (checkout) => {
    const value = Number(
      checkout?.totalPrice?.amount ?? checkout?.subtotalPrice?.amount ?? 0,
    );
    return Number.isFinite(value) ? value : 0;
  };

  const checkoutLines = (checkout) => {
    const lines = checkout?.lineItems || [];
    const rows = [];
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
      rows.push({
        id,
        name: line.title || line.variant?.title || 'Product',
        quantity,
        price: Number.isFinite(lineTotal) ? lineTotal / quantity : undefined,
      });
    }
    return rows;
  };

  const sendMetaPurchase = (checkout, eventId) => {
    if (!pixelID) return;
    const rows = checkoutLines(checkout);
    if (!rows.length) return;

    const content_ids = rows.map((r) => r.id);
    const contents = rows.map((r) => ({
      id: r.id,
      quantity: r.quantity,
      item_price: r.price,
    }));
    const value = checkoutValue(checkout);
    const currency = checkoutCurrency(checkout);

    const params = new URLSearchParams({
      id: pixelID,
      ev: 'Purchase',
      noscript: '1',
      'cd[content_type]': 'product',
      'cd[currency]': currency,
      'cd[value]': String(value),
      'cd[content_ids]': JSON.stringify(content_ids),
      'cd[contents]': JSON.stringify(contents),
      'cd[num_items]': String(
        contents.reduce((sum, row) => sum + (row.quantity || 0), 0),
      ),
    });
    if (eventId) params.set('eid', eventId);

    // Image-pixel beacon — works in the strict web-pixel sandbox.
    fetch(`https://www.facebook.com/tr/?${params.toString()}`, {
      method: 'GET',
      keepalive: true,
      mode: 'no-cors',
    }).catch(() => {});
  };

  const sendGa4Purchase = async (checkout, transactionId) => {
    if (!gaMeasurementId) return;
    const rows = checkoutLines(checkout);
    if (!rows.length) return;

    let clientId = '';
    try {
      clientId = (await browser.cookie.get('_ga')) || '';
      // _ga=GA1.1.123456789.1234567890 → use last two segments
      const parts = String(clientId).split('.');
      if (parts.length >= 4) {
        clientId = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
      } else {
        clientId = '';
      }
    } catch {
      clientId = '';
    }
    if (!clientId) {
      const seed =
        gidTail(init?.data?.customer?.id) ||
        String(Date.now()) + '.' + String(Math.floor(Math.random() * 1e9));
      clientId = seed.includes('.')
        ? seed
        : `${seed}.${Math.floor(Math.random() * 1e9)}`;
    }

    const value = checkoutValue(checkout);
    const currency = checkoutCurrency(checkout);
    const params = new URLSearchParams({
      v: '2',
      tid: gaMeasurementId,
      cid: clientId,
      en: 'purchase',
      _s: '1',
      'ep.currency': currency,
      'epn.value': String(value),
    });
    if (transactionId) params.set('ep.transaction_id', transactionId);

    rows.slice(0, 20).forEach((row, index) => {
      const n = index + 1;
      const parts = [`id${row.id}`, `nm${row.name}`, `qt${row.quantity}`];
      if (row.price != null) parts.push(`pr${row.price}`);
      params.set(`pr${n}`, parts.join('~'));
    });

    fetch(`https://www.google-analytics.com/g/collect?${params.toString()}`, {
      method: 'POST',
      keepalive: true,
      mode: 'no-cors',
      credentials: 'omit',
    }).catch(() => {});
  };

  analytics.subscribe('checkout_completed', (event) => {
    const checkout = event?.data?.checkout;
    if (!checkout) return;
    const orderId =
      gidTail(checkout.order?.id) ||
      gidTail(checkout.token) ||
      String(event?.id || '');
    const eventId = orderId ? `purchase_${orderId}` : undefined;
    sendMetaPurchase(checkout, eventId);
    void sendGa4Purchase(checkout, orderId || undefined);
  });

  analytics.subscribe('payment_info_submitted', (event) => {
    const checkout = event?.data?.checkout;
    if (!checkout || !gaMeasurementId) return;
    const rows = checkoutLines(checkout);
    if (!rows.length) return;

    void (async () => {
      let clientId = `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
      try {
        const raw = (await browser.cookie.get('_ga')) || '';
        const parts = String(raw).split('.');
        if (parts.length >= 4) {
          clientId = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
        }
      } catch {
        // keep generated client id
      }
      const value = checkoutValue(checkout);
      const currency = checkoutCurrency(checkout);
      const params = new URLSearchParams({
        v: '2',
        tid: gaMeasurementId,
        cid: clientId,
        en: 'add_payment_info',
        _s: '1',
        'ep.currency': currency,
        'epn.value': String(value),
      });
      rows.slice(0, 20).forEach((row, index) => {
        const n = index + 1;
        const parts = [`id${row.id}`, `nm${row.name}`, `qt${row.quantity}`];
        if (row.price != null) parts.push(`pr${row.price}`);
        params.set(`pr${n}`, parts.join('~'));
      });
      fetch(`https://www.google-analytics.com/g/collect?${params.toString()}`, {
        method: 'POST',
        keepalive: true,
        mode: 'no-cors',
        credentials: 'omit',
      }).catch(() => {});
    })();
  });
});
