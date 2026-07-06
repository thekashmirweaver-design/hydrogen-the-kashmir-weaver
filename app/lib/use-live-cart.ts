import {CartForm} from '@shopify/hydrogen';
import {useFetchers, useSearchParams} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {isCartFormAction} from '~/lib/cart-form-action';

type CartActionData = {
  cart?: CartApiQueryFragment | null;
};

type OptimisticCartLine = CartApiQueryFragment['lines']['nodes'][number] & {
  isOptimistic?: boolean;
};

/** Keeps cart in sync across client navigations when root loader is not revalidated. */
let cachedCart: CartApiQueryFragment | null | undefined;

export function clearLiveCartCache() {
  cachedCart = undefined;
}

export function syncLiveCartCache(cart: CartApiQueryFragment | null) {
  cachedCart = cart;
}

export function isCompleteCart(
  cart: CartApiQueryFragment | null | undefined,
): boolean {
  return Boolean(cart?.id && cart.cost?.subtotalAmount?.currencyCode);
}

function marketCountryFromFetcherKey(
  fetcherKey: string | undefined,
): string | null {
  if (!fetcherKey?.startsWith('market-')) return null;
  return fetcherKey.slice('market-'.length).toUpperCase();
}

/** Skip old market fetchers, but keep a just-finished switch before localization catches up. */
function shouldSkipMarketFetcher(
  fetcherKey: string | undefined,
  marketCountry: string | null,
  cart: CartApiQueryFragment | null | undefined,
): boolean {
  const targetCountry = marketCountryFromFetcherKey(fetcherKey);
  if (!targetCountry) return false;

  if (cart?.buyerIdentity?.countryCode?.toUpperCase() === targetCountry) {
    return false;
  }

  if (!marketCountry) return false;
  return targetCountry !== marketCountry;
}

function syncCachedCart(cart: CartApiQueryFragment | null | undefined) {
  cachedCart = cart ?? null;
  return cachedCart;
}

function getOptimisticLineId(variantId: string) {
  return `optimistic-${variantId}`;
}

function isOptimisticLineId(lineId: string) {
  return lineId.startsWith('optimistic-');
}

type OptimisticMerchandise = {
  price?: {amount: string; currencyCode: string};
};

function buildOptimisticLineCost(
  merchandise: OptimisticMerchandise,
  quantity: number,
): OptimisticCartLine['cost'] {
  const unitAmount = Number(merchandise.price?.amount ?? 0);
  const currencyCode = merchandise.price?.currencyCode ?? 'USD';
  const unit = {
    amount: String(unitAmount),
    currencyCode,
  };
  const total = {
    amount: String(unitAmount * quantity),
    currencyCode,
  };
  return {
    totalAmount: total,
    amountPerQuantity: unit,
  };
}

/** Mirror Hydrogen's optimistic cart, but only for in-flight fetchers. */
function applyOptimisticCartFromFetchers(
  cart: CartApiQueryFragment | null,
  fetchers: ReturnType<typeof useFetchers>,
): CartApiQueryFragment | null {
  const optimisticCart = cart?.lines
    ? structuredClone(cart)
    : ({lines: {nodes: []}} as unknown as CartApiQueryFragment);
  const cartLines = (optimisticCart.lines?.nodes ??
    []) as OptimisticCartLine[];

  if (!optimisticCart.lines) {
    optimisticCart.lines = {nodes: cartLines};
  }

  let isOptimistic = false;

  for (const {formData} of fetchers) {
    if (!formData) continue;

    const cartFormData = CartForm.getFormInput(formData);

    if (cartFormData.action === CartForm.ACTIONS.LinesAdd) {
      const lines = Array.isArray(cartFormData.inputs.lines)
        ? cartFormData.inputs.lines
        : [];

      for (const input of lines) {
        const selectedVariant = input.selectedVariant as
          | {id: string}
          | null
          | undefined;
        if (!selectedVariant?.id) continue;

        const existingLine = cartLines.find(
          (line) => line.merchandise.id === selectedVariant.id,
        );
        isOptimistic = true;

        const addQty = input.quantity || 1;

        if (existingLine) {
          existingLine.quantity = (existingLine.quantity || 1) + addQty;
          existingLine.isOptimistic = true;
          existingLine.cost = buildOptimisticLineCost(
            existingLine.merchandise as OptimisticMerchandise,
            existingLine.quantity,
          );
        } else {
          const optimisticLine = {
            id: getOptimisticLineId(selectedVariant.id),
            merchandise: input.selectedVariant,
            isOptimistic: true,
            quantity: addQty,
            ...((input as {attributes?: OptimisticCartLine['attributes']})
              .attributes?.length
              ? {attributes: (input as {attributes: OptimisticCartLine['attributes']}).attributes}
              : {}),
            cost: buildOptimisticLineCost(
              input.selectedVariant as OptimisticMerchandise,
              addQty,
            ),
          } as OptimisticCartLine;
          cartLines.unshift(optimisticLine);
        }
      }
    } else if (cartFormData.action === CartForm.ACTIONS.LinesRemove) {
      const lineIds = Array.isArray(cartFormData.inputs.lineIds)
        ? cartFormData.inputs.lineIds
        : [];

      for (const lineId of lineIds) {
        const index = cartLines.findIndex((line) => line.id === lineId);
        if (index === -1) continue;
        if (isOptimisticLineId(cartLines[index].id)) continue;
        cartLines.splice(index, 1);
        isOptimistic = true;
      }
    } else if (cartFormData.action === CartForm.ACTIONS.LinesUpdate) {
      const lines = Array.isArray(cartFormData.inputs.lines)
        ? cartFormData.inputs.lines
        : [];

      for (const line of lines) {
        const index = cartLines.findIndex(
          (optimisticLine) => line.id === optimisticLine.id,
        );
        if (index === -1) continue;
        if (isOptimisticLineId(cartLines[index].id)) continue;
        cartLines[index].quantity = line.quantity ?? cartLines[index].quantity;
        if (cartLines[index].quantity === 0) {
          cartLines.splice(index, 1);
        }
        isOptimistic = true;
      }
    }
  }

  if (isOptimistic) {
    (optimisticCart as CartApiQueryFragment & {isOptimistic?: boolean}).isOptimistic =
      true;
  }

  optimisticCart.totalQuantity = cartLines.reduce(
    (sum, line) => sum + (line.quantity || 0),
    0,
  );

  return optimisticCart;
}

/**
 * Instant cart UI during mutations without re-running the root loader.
 * Only in-flight fetchers affect optimistic state — idle fetchers are ignored
 * so completed adds are not applied multiple times.
 */
export function useLiveCart(
  cart: CartApiQueryFragment | null | undefined,
  options?: {marketCountry?: string},
): CartApiQueryFragment | null {
  const fetchers = useFetchers();
  const [searchParams] = useSearchParams();
  const marketCountry =
    searchParams.get('country')?.toUpperCase() ??
    options?.marketCountry?.toUpperCase() ??
    null;

  const cartFetchers = fetchers.filter(
    (fetcher) => fetcher.formData && isCartFormAction(fetcher.formAction),
  );

  const pendingFetchers = cartFetchers.filter(
    (fetcher) => fetcher.state !== 'idle',
  );

  if (pendingFetchers.length > 0) {
    const base =
      (isCompleteCart(cart) ? cart : null) ?? cachedCart ?? null;
    return syncCachedCart(
      applyOptimisticCartFromFetchers(base, pendingFetchers),
    );
  }

  for (let i = cartFetchers.length - 1; i >= 0; i--) {
    const fetcher = cartFetchers[i];
    const data = fetcher.data as CartActionData | undefined;
    if (fetcher.state === 'idle' && data && 'cart' in data) {
      const nextCart = data.cart ?? null;
      if (shouldSkipMarketFetcher(fetcher.key, marketCountry, nextCart)) continue;
      // Prefer the server response over stale optimistic cache once the fetcher settles.
      return syncCachedCart(nextCart);
    }
  }

  if (isCompleteCart(cart)) {
    return syncCachedCart(cart);
  }

  return syncCachedCart(cachedCart ?? null);
}
