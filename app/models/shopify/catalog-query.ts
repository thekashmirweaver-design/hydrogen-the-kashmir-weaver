import type {Storefront} from '@shopify/hydrogen';

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
): Promise<T> {
  const cache = storefront.CacheLong();
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
