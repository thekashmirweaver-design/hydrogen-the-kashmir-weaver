import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router';
import {
  useAnalytics,
  type CartLineUpdatePayload,
  type CartViewPayload,
  type ProductViewPayload,
} from '@shopify/hydrogen';
import type {CartLine, ComponentizableCartLine} from '@shopify/hydrogen/storefront-api-types';

export const GA_MEASUREMENT_ID = 'G-2WQQF2JKTQ';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type GaItem = {
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_brand?: string;
  item_category?: string;
  price?: number;
  quantity?: number;
};

let gtagLoadPromise: Promise<void> | null = null;

function loadGtag(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (gtagLoadPromise) return gtagLoadPromise;
  if (typeof window.gtag === 'function') return Promise.resolve();

  gtagLoadPromise = new Promise((resolve) => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: true,
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  return gtagLoadPromise;
}

function scheduleGtagLoad() {
  const run = () => {
    void loadGtag();
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, {timeout: 4000});
  } else {
    window.setTimeout(run, 2500);
  }

  const onInteract = () => {
    run();
    window.removeEventListener('pointerdown', onInteract);
    window.removeEventListener('keydown', onInteract);
  };
  window.addEventListener('pointerdown', onInteract, {once: true, passive: true});
  window.addEventListener('keydown', onInteract, {once: true});
}

function gidTail(id?: string | null): string {
  if (!id) return '';
  const parts = id.split('/');
  return parts[parts.length - 1] || id;
}

function moneyAmount(
  money?: {amount?: string | number; currencyCode?: string} | null,
): number | undefined {
  if (money?.amount == null || money.amount === '') return undefined;
  const n = typeof money.amount === 'number' ? money.amount : Number(money.amount);
  return Number.isFinite(n) ? n : undefined;
}

type TrackableCart = {
  cost?: {
    totalAmount?: {amount?: string | number; currencyCode?: string} | null;
    subtotalAmount?: {amount?: string | number; currencyCode?: string} | null;
  } | null;
  lines?: unknown;
} | null | undefined;

function cartCurrency(cart: TrackableCart, fallback = 'USD'): string {
  return (
    cart?.cost?.totalAmount?.currencyCode ||
    cart?.cost?.subtotalAmount?.currencyCode ||
    fallback
  );
}

function lineToGaItem(
  line?: CartLine | ComponentizableCartLine | null,
): GaItem | null {
  if (!line || !('merchandise' in line) || !line.merchandise) return null;
  const merch = line.merchandise;
  if (merch.__typename && merch.__typename !== 'ProductVariant') return null;
  const product = 'product' in merch ? merch.product : undefined;
  const price =
    moneyAmount(line.cost?.totalAmount) != null && line.quantity
      ? moneyAmount(line.cost?.totalAmount)! / line.quantity
      : moneyAmount(merch.price);
  return {
    item_id: gidTail(merch.id) || gidTail(product?.id),
    item_name: product?.title || merch.title || 'Product',
    item_variant: merch.title,
    item_brand: product?.vendor,
    item_category: product?.productType || undefined,
    price,
    quantity: line.quantity,
  };
}

function productsPayloadToItems(payload: ProductViewPayload): GaItem[] {
  return (payload.products ?? []).map((p) => ({
    item_id: gidTail(p.variantId) || gidTail(p.id),
    item_name: p.title,
    item_variant: p.variantTitle,
    item_brand: p.vendor,
    item_category: p.productType,
    price: p.price != null && p.price !== '' ? Number(p.price) : undefined,
    quantity: p.quantity ?? 1,
  }));
}

function cartLines(cart: TrackableCart): Array<CartLine | ComponentizableCartLine> {
  const lines = cart?.lines as
    | Array<CartLine | ComponentizableCartLine>
    | {nodes?: Array<CartLine | ComponentizableCartLine>}
    | {edges?: Array<{node: CartLine | ComponentizableCartLine}>}
    | null
    | undefined;
  if (!lines) return [];
  if (Array.isArray(lines)) return lines;
  if ('nodes' in lines && Array.isArray(lines.nodes)) return lines.nodes;
  if ('edges' in lines && Array.isArray(lines.edges)) {
    return lines.edges.map((edge) => edge.node);
  }
  return [];
}

function cartToItems(cart: TrackableCart): GaItem[] {
  return cartLines(cart)
    .map((line) => lineToGaItem(line))
    .filter((item): item is GaItem => Boolean(item));
}

function cartValue(cart: TrackableCart): number | undefined {
  return moneyAmount(cart?.cost?.totalAmount ?? cart?.cost?.subtotalAmount);
}

async function sendGaEvent(
  name: string,
  params: Record<string, unknown>,
): Promise<void> {
  await loadGtag();
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

/**
 * Fire begin_checkout when the shopper leaves for Shopify checkout / Buy Now.
 * Safe to call from checkout link click handlers.
 */
export function trackBeginCheckout(cart: TrackableCart): void {
  const items = cartToItems(cart);
  if (!items.length) return;
  void sendGaEvent('begin_checkout', {
    currency: cartCurrency(cart),
    value: cartValue(cart),
    items,
  });
}

/**
 * Buy Now / cart-line deep link before a full cart object exists.
 */
export function trackBeginCheckoutItems(
  items: GaItem[],
  currency = 'USD',
  value?: number,
): void {
  if (!items.length) return;
  void sendGaEvent('begin_checkout', {
    currency,
    value: value ?? items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0),
    items,
  });
}

/**
 * Defers GA4 until idle / first interaction so gtag does not compete with LCP.
 * Subscribes to Hydrogen Analytics ecommerce events and forwards them to GA4.
 */
export function GoogleAnalytics(): null {
  const location = useLocation();
  const isFirstPath = useRef(true);
  const bootstrapped = useRef(false);
  const {subscribe, register, canTrack} = useAnalytics();
  const {ready} = register('Google Analytics');

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    scheduleGtagLoad();
  }, []);

  useEffect(() => {
    subscribe('product_viewed', (payload: ProductViewPayload) => {
      if (!canTrack()) return;
      const items = productsPayloadToItems(payload);
      if (!items.length) return;
      const currency = payload.shop?.currency || 'USD';
      const value = items.reduce(
        (sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1),
        0,
      );
      void sendGaEvent('view_item', {currency, value, items});
    });

    subscribe('product_added_to_cart', (payload: CartLineUpdatePayload) => {
      if (!canTrack()) return;
      const item = lineToGaItem(payload.currentLine);
      if (!item) return;
      const prevQty = payload.prevLine?.quantity ?? 0;
      const nextQty = payload.currentLine?.quantity ?? item.quantity ?? 1;
      const addedQty = Math.max(1, nextQty - prevQty);
      const lineItem = {...item, quantity: addedQty};
      void sendGaEvent('add_to_cart', {
        currency: cartCurrency(payload.cart, payload.shop?.currency),
        value: (lineItem.price ?? 0) * addedQty,
        items: [lineItem],
      });
    });

    subscribe('product_removed_from_cart', (payload: CartLineUpdatePayload) => {
      if (!canTrack()) return;
      const item = lineToGaItem(payload.prevLine ?? payload.currentLine);
      if (!item) return;
      const prevQty = payload.prevLine?.quantity ?? item.quantity ?? 1;
      const nextQty = payload.currentLine?.quantity ?? 0;
      const removedQty = Math.max(1, prevQty - nextQty);
      const lineItem = {...item, quantity: removedQty};
      void sendGaEvent('remove_from_cart', {
        currency: cartCurrency(payload.cart, payload.shop?.currency),
        value: (lineItem.price ?? 0) * removedQty,
        items: [lineItem],
      });
    });

    subscribe('cart_viewed', (payload: CartViewPayload) => {
      if (!canTrack()) return;
      const items = cartToItems(payload.cart);
      if (!items.length) return;
      void sendGaEvent('view_cart', {
        currency: cartCurrency(payload.cart, payload.shop?.currency),
        value: cartValue(payload.cart),
        items,
      });
    });

    ready();
  }, [subscribe, ready, canTrack]);

  useEffect(() => {
    if (isFirstPath.current) {
      isFirstPath.current = false;
      return;
    }
    void loadGtag().then(() => {
      if (typeof window.gtag !== 'function') return;
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: `${location.pathname}${location.search}`,
      });
    });
  }, [location.pathname, location.search]);

  return null;
}
