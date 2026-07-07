import type {Storefront} from '@shopify/hydrogen';
import {productCache} from '~/lib/storefront-cache';

const INVENTORY_SCOPE_ERROR =
  /unauthenticated_read_product_inventory|quantityAvailable/i;

function isInventoryScopeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return INVENTORY_SCOPE_ERROR.test(message);
}

/** Retry catalog queries without quantityAvailable when inventory scope is missing. */
export async function catalogQuery<T>(
  storefront: Storefront,
  withInventory: string,
  withoutInventory: string,
  variables: Record<string, unknown>,
  cache = productCache(storefront),
): Promise<T> {
  try {
    return (await storefront.query(withInventory, {variables, cache})) as T;
  } catch (error) {
    if (!isInventoryScopeError(error)) throw error;
    console.warn(
      '[catalog] Missing unauthenticated_read_product_inventory scope; omitting quantityAvailable',
    );
    return (await storefront.query(withoutInventory, {variables, cache})) as T;
  }
}
