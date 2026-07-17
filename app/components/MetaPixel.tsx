import {useEffect, useRef} from 'react';
import {useLocation, useRouteLoaderData} from 'react-router';
import {
  useAnalytics,
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

/** Only send hits from Shopify storefront hosts — skip localhost / tunnels. */
function isShopifyStorefrontHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host.includes('ngrok') || host.endsWith('.local')) return false;
  if (host === 'thekashmirweaver.shop' || host === 'www.thekashmirweaver.shop') {
    return true;
  }
  if (host.endsWith('.myshopify.com') && !host.endsWith('.o2.myshopify.dev')) {
    return true;
  }
  if (host.endsWith('.hydrogen.shop')) return true;
  return false;
}

function shouldSendToMeta(pixelId?: string | null): boolean {
  if (!pixelId?.trim()) return false;
  if (typeof window === 'undefined') return false;
  return isShopifyStorefrontHost(window.location.hostname);
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

async function sendMetaEvent(
  pixelId: string,
  name: string,
  params?: MetaContent,
): Promise<void> {
  if (!shouldSendToMeta(pixelId)) return;
  await loadFbq(pixelId);
  if (typeof window.fbq !== 'function') return;
  if (params) window.fbq('track', name, params);
  else window.fbq('track', name);
}

function cartSnapshotKey(cart: TrackableCart): string | null {
  if (!cart?.id || !cart.updatedAt) return null;
  return `${cart.id}:${cart.updatedAt}`;
}

function publishCartDiffToMeta(
  pixelId: string,
  cart: TrackableCart,
  prevCart: TrackableCart,
  shopCurrency?: string,
): void {
  const currency = cartCurrency(cart, shopCurrency || 'USD');
  const previousLines = cartLines(prevCart);
  const currentLines = cartLines(cart);
  const prevById = new Map(previousLines.map((line) => [line.id, line]));
  const currentById = new Map(currentLines.map((line) => [line.id, line]));

  for (const [id, prevLine] of prevById) {
    const nextLine = currentById.get(id);
    if (!nextLine) continue;
    if (prevLine.quantity >= nextLine.quantity) continue;
    const row = lineMeta(nextLine);
    if (!row) continue;
    const addedQty = nextLine.quantity - prevLine.quantity;
    void sendMetaEvent(pixelId, 'AddToCart', {
      content_ids: [row.id],
      content_type: 'product',
      content_name: row.name,
      content_category: row.category,
      value: (row.price ?? 0) * addedQty,
      currency,
      num_items: addedQty,
      contents: [{id: row.id, quantity: addedQty, item_price: row.price}],
    });
  }

  for (const [id, line] of currentById) {
    if (prevById.has(id)) continue;
    const row = lineMeta(line);
    if (!row) continue;
    void sendMetaEvent(pixelId, 'AddToCart', {
      content_ids: [row.id],
      content_type: 'product',
      content_name: row.name,
      content_category: row.category,
      value: (row.price ?? 0) * row.quantity,
      currency,
      num_items: row.quantity,
      contents: [{id: row.id, quantity: row.quantity, item_price: row.price}],
    });
  }
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
 * Meta Pixel for catalogue ads. Sends Shopify variant IDs as content_ids so
 * they match the Facebook & Instagram sales-channel catalogue sync.
 * Requires PUBLIC_META_PIXEL_ID in Oxygen / .env.
 */
export function MetaPixel(): null {
  const data = useRouteLoaderData<RootLoader>('root');
  const pixelId = data?.metaPixelId?.trim() || META_PIXEL_ID;
  const location = useLocation();
  const isFirstPath = useRef(true);
  const bootstrapped = useRef(false);
  const lastCartKey = useRef<string | null>(null);
  const {subscribe, register, canTrack, cart, prevCart, shop} = useAnalytics();
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

    subscribe('product_viewed', (payload: ProductViewPayload) => {
      if (!canTrack()) return;
      const params = productsToMeta(payload);
      if (!params) return;
      void sendMetaEvent(pixelId, 'ViewContent', params);
    });

    subscribe('cart_viewed', (payload: CartViewPayload) => {
      if (!canTrack()) return;
      const params = cartToMeta(payload.cart, payload.shop?.currency);
      if (!params) return;
      // Not a standard Meta event — use trackCustom so it does not skew match rate.
      void loadFbq(pixelId).then(() => {
        if (!shouldSendToMeta(pixelId) || typeof window.fbq !== 'function') return;
        window.fbq('trackCustom', 'ViewCart', params);
      });
    });

    ready();
  }, [subscribe, ready, canTrack, pixelId]);

  useEffect(() => {
    if (!pixelId || !canTrack()) return;
    const key = cartSnapshotKey(cart);
    if (!key) return;
    if (lastCartKey.current === key) return;
    lastCartKey.current = key;

    if (!prevCart?.updatedAt || prevCart.updatedAt === cart?.updatedAt) {
      return;
    }

    publishCartDiffToMeta(pixelId, cart, prevCart, shop?.currency);
  }, [cart, prevCart, canTrack, shop?.currency, pixelId]);

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
