import {useOptimisticCart} from '@shopify/hydrogen';
import {useFetchers} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {isCartFormAction} from '~/lib/cart-form-action';

type CartActionData = {
  cart?: CartApiQueryFragment | null;
};

/** Keeps cart in sync across client navigations when root loader is not revalidated. */
let cachedCart: CartApiQueryFragment | null | undefined;

function syncCachedCart(cart: CartApiQueryFragment | null | undefined) {
  cachedCart = cart ?? null;
  return cachedCart;
}

/**
 * Instant cart UI during mutations: optimistic deltas while a fetcher is
 * in-flight, then the cart returned by the /cart action (without reloading
 * the heavy root loader).
 */
export function useLiveCart(
  cart: CartApiQueryFragment | null | undefined,
): CartApiQueryFragment | null {
  const fetchers = useFetchers();
  const baseCart =
    cachedCart !== undefined ? cachedCart : syncCachedCart(cart ?? null);
  const optimisticCart = useOptimisticCart(baseCart);

  const cartFetchers = fetchers.filter(
    (fetcher) => fetcher.formData && isCartFormAction(fetcher.formAction),
  );

  const hasPending = cartFetchers.some((fetcher) => fetcher.state !== 'idle');
  if (hasPending) {
    return syncCachedCart(
      (optimisticCart ?? baseCart ?? null) as CartApiQueryFragment | null,
    );
  }

  for (let i = cartFetchers.length - 1; i >= 0; i--) {
    const data = cartFetchers[i].data as CartActionData | undefined;
    if (data?.cart) return syncCachedCart(data.cart);
  }

  return syncCachedCart(baseCart ?? cart ?? null);
}
