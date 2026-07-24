import {useEffect, useRef} from 'react';
import {useLocation, useRouteLoaderData} from 'react-router';
import {
  useAnalytics,
  type CartLineUpdatePayload,
  type CartViewPayload,
  type ProductViewPayload,
} from '@shopify/hydrogen';
import type {
  CartLine,
  ComponentizableCartLine,
} from '@shopify/hydrogen/storefront-api-types';
import type {RootLoader} from '~/root';

/** Meta Pixel — Events Manager. Public client ID (same class as GA measurement ID). */
export const META_PIXEL_ID = '1724382275473712';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

type MetaContent = {
  content_ids: string[];
  content_type: 'product';
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
  num_items?: number;
  contents?: Array<{id: string; quantity: number; item_price?: number}>;
};

type TrackableCart = {
  id?: string | null;
  updatedAt?: string | null;
  cost?: {
    totalAmount?: {amount?: string | number; currencyCode?: string} | null;
    subtotalAmount?: {amount?: string | number; currencyCode?: string} | null;
  } | null;
  lines?: unknown;
} | null | undefined;

let fbqLoadPromise: Promise<void> | null = null;
let activePixelId: string | null = null;

/** Shopify Markets catalogue sync uses numeric variant IDs as Meta Content IDs. */
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

function cartCurrency(cart: TrackableCart, fallback = 'USD'): string {
  return (
    cart?.cost?.totalAmount?.currencyCode ||
    cart?.cost?.subtotalAmount?.currencyCode ||
    fallback
  );
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

function lineMeta(
  line?: CartLine | ComponentizableCartLine | null,
): {id: string; name?: string; category?: string; price?: number; quantity: number} | null {
  if (!line || !('merchandise' in line) || !line.merchandise) return null;
  const merch = line.merchandise;
  if (merch.__typename && merch.__typename !== 'ProductVariant') return null;
  const product = 'product' in merch ? merch.product : undefined;
  const id = gidTail(merch.id) || gidTail(product?.id);
  if (!id) return null;
  const price =
    moneyAmount(line.cost?.totalAmount) != null && line.quantity
      ? moneyAmount(line.cost?.totalAmount)! / line.quantity
      : moneyAmount(merch.price);
  return {
    id,
    name: product?.title || merch.title,
    category: product?.productType || undefined,
    price,
    quantity: line.quantity,
  };
}

function cartToMeta(cart: TrackableCart, currencyFallback?: string): MetaContent | null {
  const rows = cartLines(cart)
    .map((line) => lineMeta(line))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  if (!rows.length) return null;
  const value = rows.reduce((sum, r) => sum + (r.price ?? 0) * r.quantity, 0);
  return {
    content_ids: rows.map((r) => r.id),
    content_type: 'product',
    content_name: rows.map((r) => r.name).filter(Boolean).join(', ') || undefined,
    value,
    currency: cartCurrency(cart, currencyFallback),
    num_items: rows.reduce((sum, r) => sum + r.quantity, 0),
    contents: rows.map((r) => ({
      id: r.id,
      quantity: r.quantity,
      item_price: r.price,
    })),
  };
}

function productsToMeta(payload: ProductViewPayload): MetaContent | null {
  const products = payload.products ?? [];
  const ids = products
    .map((p) => gidTail(p.variantId) || gidTail(p.id))
    .filter(Boolean);
  if (!ids.length) return null;
  const value = products.reduce((sum, p) => {
    const price = p.price != null && p.price !== '' ? Number(p.price) : 0;
    return sum + (Number.isFinite(price) ? price : 0) * (p.quantity ?? 1);
  }, 0);
  return {
    content_ids: ids,
    content_type: 'product',
    content_name: products[0]?.title,
    content_category: products[0]?.productType,
    value,
    currency: payload.shop?.currency || 'USD',
    contents: products.map((p) => ({
      id: gidTail(p.variantId) || gidTail(p.id),
      quantity: p.quantity ?? 1,
      item_price:
        p.price != null && p.price !== '' && Number.isFinite(Number(p.price))
          ? Number(p.price)
          : undefined,
    })).filter((c) => c.id),
  };
}

/**
 * Production Hydrogen host only — skip localhost, tunnels, myshopify Online Store,
 * and Oxygen preview so Meta stays aligned with thekashmirweaver.shop.
 */
function isPrimaryStorefrontHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'thekashmirweaver.shop' || host === 'www.thekashmirweaver.shop'
  );
}

function shouldSendToMeta(pixelId?: string | null): boolean {
  if (!pixelId?.trim()) return false;
  if (typeof window === 'undefined') return false;
  return isPrimaryStorefrontHost(window.location.hostname);
}

function loadFbq(pixelId: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (fbqLoadPromise && activePixelId === pixelId) return fbqLoadPromise;
  if (typeof window.fbq === 'function' && activePixelId === pixelId) {
    return Promise.resolve();
  }

  activePixelId = pixelId;
  fbqLoadPromise = new Promise((resolve) => {
    if (typeof window.fbq !== 'function') {
      // Official Meta Pixel stub (queue drains when fbevents.js loads).
      type FbqFn = ((...args: unknown[]) => void) & {
        callMethod?: (...args: unknown[]) => void;
        queue: unknown[];
        push: unknown;
        loaded: boolean;
        version: string;
      };
      const fbq = function (...args: unknown[]) {
        const self = fbq as FbqFn;
        if (self.callMethod) self.callMethod(...args);
        else self.queue.push(args);
      } as FbqFn;
      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.push = fbq;
      window.fbq = fbq;
      if (!window._fbq) window._fbq = fbq;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    } else {
      resolve();
    }

    window.fbq?.('init', pixelId);
    window.fbq?.('track', 'PageView');
  });

  return fbqLoadPromise;
}

function scheduleFbqLoad(pixelId: string) {
  const run = () => {
    void loadFbq(pixelId);
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, {timeout: 15000});
  } else {
    window.setTimeout(run, 8000);
  }

  const onInteract = () => {
    run();
    window.removeEventListener('pointerdown', onInteract);
    window.removeEventListener('keydown', onInteract);
  };
  window.addEventListener('pointerdown', onInteract, {once: true, passive: true});
  window.addEventListener('keydown', onInteract, {once: true});
}

/** Collapse PDP click + Hydrogen analytics double-fires within a short window. */
let lastAddToCartDedupe = '';
let lastAddToCartAt = 0;

function shouldSkipDuplicateAddToCart(params?: MetaContent): boolean {
  if (!params?.content_ids?.length) return false;
  const key = `${params.content_ids.join(',')}:${params.num_items ?? 0}:${params.value ?? 0}`;
  const now = Date.now();
  if (key === lastAddToCartDedupe && now - lastAddToCartAt < 2500) return true;
  lastAddToCartDedupe = key;
  lastAddToCartAt = now;
  return false;
}

async function sendMetaEvent(
  pixelId: string,
  name: string,
  params?: MetaContent,
  eventId?: string,
): Promise<void> {
  if (!shouldSendToMeta(pixelId)) return;
  if (name === 'AddToCart' && shouldSkipDuplicateAddToCart(params)) return;
  await loadFbq(pixelId);
  if (typeof window.fbq !== 'function') return;
  const options = eventId ? {eventID: eventId} : undefined;
  if (params) window.fbq('track', name, params, options);
  else window.fbq('track', name, undefined, options);
}

function addToCartFromLine(
  pixelId: string,
  line: CartLine | ComponentizableCartLine | null | undefined,
  currency: string,
  prevQuantity = 0,
  eventId?: string,
): void {
  const row = lineMeta(line);
  if (!row) return;
  const addedQty = Math.max(1, row.quantity - prevQuantity);
  void sendMetaEvent(
    pixelId,
    'AddToCart',
    {
      content_ids: [row.id],
      content_type: 'product',
      content_name: row.name,
      content_category: row.category,
      value: (row.price ?? 0) * addedQty,
      currency,
      num_items: addedQty,
      contents: [{id: row.id, quantity: addedQty, item_price: row.price}],
    },
    eventId,
  );
}

function addToCartFromAnalyticsPayload(
  pixelId: string,
  payload: CartLineUpdatePayload,
): void {
  const line = payload.currentLine;
  if (!line) return;
  const currency = cartCurrency(payload.cart, payload.shop?.currency || 'USD');
  const prevQty = payload.prevLine?.quantity ?? 0;
  addToCartFromLine(
    pixelId,
    line,
    currency,
    prevQty,
    line.id ? `atc_${gidTail(line.id)}_${line.quantity}` : undefined,
  );
}

/**
 * Fire InitiateCheckout when the shopper leaves for Shopify checkout / Buy Now.
 */
export function trackMetaInitiateCheckout(
  cart: TrackableCart,
  pixelId?: string | null,
): void {
  const id = pixelId?.trim() || META_PIXEL_ID;
  if (!shouldSendToMeta(id)) return;
  const params = cartToMeta(cart);
  if (!params) return;
  void sendMetaEvent(id, 'InitiateCheckout', params);
}

export function trackMetaInitiateCheckoutItems(
  items: Array<{
    item_id: string;
    item_name?: string;
    item_category?: string;
    price?: number;
    quantity?: number;
  }>,
  currency = 'USD',
  value?: number,
  pixelId?: string | null,
): void {
  const id = pixelId?.trim() || META_PIXEL_ID;
  if (!shouldSendToMeta(id) || !items.length) return;
  const content_ids = items.map((i) => gidTail(i.item_id)).filter(Boolean);
  if (!content_ids.length) return;
  void sendMetaEvent(id, 'InitiateCheckout', {
    content_ids,
    content_type: 'product',
    content_name: items[0]?.item_name,
    content_category: items[0]?.item_category,
    currency,
    value:
      value ??
      items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0),
    num_items: items.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
    contents: items.map((i) => ({
      id: gidTail(i.item_id),
      quantity: i.quantity ?? 1,
      item_price: i.price,
    })).filter((c) => c.id),
  });
}

/**
 * Fire AddToCart from PDP / bag actions. Same host gate as InitiateCheckout —
 * do not wait on Customer Privacy `canTrack()` (that race was dropping ATC).
 */
export function trackMetaAddToCart(
  items: Array<{
    item_id: string;
    item_name?: string;
    item_category?: string;
    price?: number;
    quantity?: number;
  }>,
  currency = 'USD',
  value?: number,
  pixelId?: string | null,
): void {
  const id = pixelId?.trim() || META_PIXEL_ID;
  if (!shouldSendToMeta(id) || !items.length) return;
  const content_ids = items.map((i) => gidTail(i.item_id)).filter(Boolean);
  if (!content_ids.length) return;
  const num_items = items.reduce((sum, i) => sum + (i.quantity ?? 1), 0);
  void sendMetaEvent(id, 'AddToCart', {
    content_ids,
    content_type: 'product',
    content_name: items[0]?.item_name,
    content_category: items[0]?.item_category,
    currency,
    value:
      value ??
      items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0),
    num_items,
    contents: items
      .map((i) => ({
        id: gidTail(i.item_id),
        quantity: i.quantity ?? 1,
        item_price: i.price,
      }))
      .filter((c) => c.id),
  });
}

/**
 * Meta Pixel for catalogue ads. Sends Shopify variant IDs as content_ids so
 * they match the Facebook & Instagram sales-channel catalogue sync.
 * Purchase must fire from Shopify checkout (Customer Events custom pixel) —
 * see scripts/meta-pixel-shopify-custom-pixel.js (and GA4 twin
 * scripts/ga4-shopify-custom-pixel.js).
 */
export function MetaPixel(): null {
  const data = useRouteLoaderData<RootLoader>('root');
  const pixelId = data?.metaPixelId?.trim() || META_PIXEL_ID;
  const location = useLocation();
  const isFirstPath = useRef(true);
  const bootstrapped = useRef(false);
  const {subscribe, register} = useAnalytics();
  const {ready} = register('Meta Pixel');

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (shouldSendToMeta(pixelId)) scheduleFbqLoad(pixelId);
  }, [pixelId]);

  useEffect(() => {
    if (!pixelId) {
      ready();
      return;
    }

    // Host gate only — do not require canTrack (consent race dropped ViewContent).
    subscribe('product_viewed', (payload: ProductViewPayload) => {
      const params = productsToMeta(payload);
      if (!params) return;
      void sendMetaEvent(pixelId, 'ViewContent', params);
    });

    subscribe('cart_viewed', (payload: CartViewPayload) => {
      const params = cartToMeta(payload.cart, payload.shop?.currency);
      if (!params) return;
      void loadFbq(pixelId).then(() => {
        if (!shouldSendToMeta(pixelId) || typeof window.fbq !== 'function') return;
        window.fbq('trackCustom', 'ViewCart', params);
      });
    });

    subscribe('product_added_to_cart', (payload: CartLineUpdatePayload) => {
      addToCartFromAnalyticsPayload(pixelId, payload);
    });

    ready();
  }, [subscribe, ready, pixelId]);

  useEffect(() => {
    if (!shouldSendToMeta(pixelId)) return;
    if (isFirstPath.current) {
      isFirstPath.current = false;
      return;
    }
    void loadFbq(pixelId).then(() => {
      if (typeof window.fbq !== 'function') return;
      window.fbq('track', 'PageView');
    });
  }, [location.pathname, location.search, pixelId]);

  return null;
}
