import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router';
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

type TrackableCart = {
  id?: string | null;
  updatedAt?: string | null;
  cost?: {
    totalAmount?: {amount?: string | number; currencyCode?: string} | null;
    subtotalAmount?: {amount?: string | number; currencyCode?: string} | null;
  } | null;
  lines?: unknown;
} | null | undefined;

let gtagLoadPromise: Promise<void> | null = null;
let lastAddToCartDedupe = '';
let lastAddToCartAt = 0;

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

/**
 * Production Hydrogen host only — skip localhost, tunnels, myshopify Online Store,
 * and Oxygen preview so GA4 stays clean for thekashmirweaver.shop.
 */
function isPrimaryStorefrontHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'thekashmirweaver.shop' || host === 'www.thekashmirweaver.shop'
  );
}

function shouldSendToGa(): boolean {
  if (typeof window === 'undefined') return false;
  return isPrimaryStorefrontHost(window.location.hostname);
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

function shouldSkipDuplicateAddToCart(items: GaItem[]): boolean {
  if (!items.length) return false;
  const key = items
    .map((i) => `${i.item_id}:${i.quantity ?? 0}:${i.price ?? 0}`)
    .join('|');
  const now = Date.now();
  if (key === lastAddToCartDedupe && now - lastAddToCartAt < 2500) return true;
  lastAddToCartDedupe = key;
  lastAddToCartAt = now;
  return false;
}

async function sendGaEvent(
  name: string,
  params: Record<string, unknown>,
): Promise<void> {
  if (!shouldSendToGa()) return;
  await loadGtag();
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

function sendAddToCartEvent(
  items: GaItem[],
  currency: string,
  value?: number,
): void {
  if (!items.length) return;
  if (shouldSkipDuplicateAddToCart(items)) return;
  void sendGaEvent('add_to_cart', {
    currency,
    value:
      value ??
      items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0),
    items,
  });
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
 * Fire add_to_cart from PDP / bag actions. Host-gated only — do not wait on
 * Customer Privacy `canTrack()` (that race was dropping ATC and view_item).
 */
export function trackAddToCart(
  items: GaItem[],
  currency = 'USD',
  value?: number,
): void {
  sendAddToCartEvent(items, currency, value);
}

function cartSnapshotKey(cart: TrackableCart): string | null {
  if (!cart?.id || !cart.updatedAt) return null;
  return `${cart.id}:${cart.updatedAt}`;
}

/**
 * Diff settled Shopify carts (from Hydrogen Analytics context) into GA4
 * cart events. Backup for quantity changes when product_added_to_cart is missed.
 */
function publishCartDiffToGa(
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
    if (!nextLine) {
      const item = lineToGaItem(prevLine);
      if (!item) continue;
      void sendGaEvent('remove_from_cart', {
        currency,
        value: (item.price ?? 0) * (item.quantity ?? 1),
        items: [item],
      });
      continue;
    }
    if (prevLine.quantity < nextLine.quantity) {
      const item = lineToGaItem(nextLine);
      if (!item) continue;
      const addedQty = nextLine.quantity - prevLine.quantity;
      sendAddToCartEvent(
        [{...item, quantity: addedQty}],
        currency,
        (item.price ?? 0) * addedQty,
      );
    } else if (prevLine.quantity > nextLine.quantity) {
      const item = lineToGaItem(prevLine);
      if (!item) continue;
      const removedQty = prevLine.quantity - nextLine.quantity;
      const lineItem = {...item, quantity: removedQty};
      void sendGaEvent('remove_from_cart', {
        currency,
        value: (lineItem.price ?? 0) * removedQty,
        items: [lineItem],
      });
    }
  }

  for (const [id, line] of currentById) {
    if (prevById.has(id)) continue;
    const item = lineToGaItem(line);
    if (!item) continue;
    sendAddToCartEvent(
      [item],
      currency,
      (item.price ?? 0) * (item.quantity ?? 1),
    );
  }
}

function addToCartFromAnalyticsPayload(payload: CartLineUpdatePayload): void {
  const line = payload.currentLine;
  if (!line) return;
  const item = lineToGaItem(line);
  if (!item) return;
  const prevQty = payload.prevLine?.quantity ?? 0;
  const addedQty = Math.max(1, (item.quantity ?? 1) - prevQty);
  const lineItem = {...item, quantity: addedQty};
  sendAddToCartEvent(
    [lineItem],
    cartCurrency(payload.cart, payload.shop?.currency || 'USD'),
    (lineItem.price ?? 0) * addedQty,
  );
}

function removeFromCartFromAnalyticsPayload(
  payload: CartLineUpdatePayload,
): void {
  const line = payload.prevLine ?? payload.currentLine;
  if (!line) return;
  const item = lineToGaItem(line);
  if (!item) return;
  const nextQty = payload.currentLine?.quantity ?? 0;
  const prevQty = payload.prevLine?.quantity ?? item.quantity ?? 1;
  const removedQty = Math.max(1, prevQty - nextQty);
  const lineItem = {...item, quantity: removedQty};
  void sendGaEvent('remove_from_cart', {
    currency: cartCurrency(payload.cart, payload.shop?.currency || 'USD'),
    value: (lineItem.price ?? 0) * removedQty,
    items: [lineItem],
  });
}

/**
 * Defers GA4 until idle / first interaction so gtag does not compete with LCP.
 * Ecommerce payloads use Hydrogen Analytics + direct PDP hooks (SSOT).
 * Purchase fires from Shopify Customer Events — see
 * scripts/ga4-shopify-custom-pixel.js.
 */
export function GoogleAnalytics(): null {
  const location = useLocation();
  const isFirstPath = useRef(true);
  const bootstrapped = useRef(false);
  const lastCartKey = useRef<string | null>(null);
  const {subscribe, register, cart, prevCart, shop} = useAnalytics();
  const {ready} = register('Google Analytics');

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (shouldSendToGa()) scheduleGtagLoad();
  }, []);

  useEffect(() => {
    // Host gate only — do not require canTrack (consent race dropped ecommerce).
    subscribe('product_viewed', (payload: ProductViewPayload) => {
      const items = productsPayloadToItems(payload);
      if (!items.length) return;
      const currency = payload.shop?.currency || 'USD';
      const value = items.reduce(
        (sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1),
        0,
      );
      void sendGaEvent('view_item', {currency, value, items});
    });

    subscribe('cart_viewed', (payload: CartViewPayload) => {
      const items = cartToItems(payload.cart);
      if (!items.length) return;
      void sendGaEvent('view_cart', {
        currency: cartCurrency(payload.cart, payload.shop?.currency),
        value: cartValue(payload.cart),
        items,
      });
    });

    subscribe('product_added_to_cart', (payload: CartLineUpdatePayload) => {
      addToCartFromAnalyticsPayload(payload);
    });

    subscribe('product_removed_from_cart', (payload: CartLineUpdatePayload) => {
      removeFromCartFromAnalyticsPayload(payload);
    });

    ready();
  }, [subscribe, ready]);

  // Cart add/remove backup: diff settled cart when Analytics line events miss.
  useEffect(() => {
    if (!shouldSendToGa()) return;
    const key = cartSnapshotKey(cart);
    if (!key) return;
    if (lastCartKey.current === key) return;
    lastCartKey.current = key;

    // First settled cart in the session is baseline only (avoid fake adds).
    if (!prevCart?.updatedAt || prevCart.updatedAt === cart?.updatedAt) {
      return;
    }

    publishCartDiffToGa(cart, prevCart, shop?.currency);
  }, [cart, prevCart, shop?.currency]);

  useEffect(() => {
    if (!shouldSendToGa()) return;
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
