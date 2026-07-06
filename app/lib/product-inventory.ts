import type {Product, ProductVariant} from '~/models/types';

/** Max qty in UI when Shopify inventory is not tracked (checkout may enforce its own limit). */
export const UNTRACKED_MAX_QTY = 99;

/**
 * A variant is only meaningfully "tracked" when Shopify reports a positive
 * quantity. `0` or negative `quantityAvailable` with `availableForSale: true`
 * means "Continue selling when out of stock" is enabled in Admin — i.e. the
 * variant is effectively unlimited, not capped at 1.
 */
function isTrackedInventory(variant: ProductVariant): boolean {
  return (
    typeof variant.quantityAvailable === 'number' && variant.quantityAvailable > 0
  );
}

/**
 * Quantity +/- rules:
 * - Not tracked (quantityAvailable is null/undefined, or <= 0 with oversell
 *   allowed): always show increment
 * - Tracked qty === 1: hide increment
 * - Tracked qty > 1: show increment, capped at available qty
 */
export function showQuantitySelector(variant: ProductVariant | null): boolean {
  if (!variant?.availableForSale) return false;
  if (isTrackedInventory(variant)) return variant.quantityAvailable! > 1;
  return true;
}

export function maxCartQuantity(variant: ProductVariant | null): number {
  if (!variant) return 1;
  if (isTrackedInventory(variant)) return Math.max(1, variant.quantityAvailable!);
  return UNTRACKED_MAX_QTY;
}

export function variantScarcityLabel(
  variant: ProductVariant | null,
  product: Product,
): string | null {
  if (!variant?.availableForSale) return null;

  if (isTrackedInventory(variant)) {
    const qty = variant.quantityAvailable!;
    if (qty === 1) return 'Last one';
    if (qty > 1 && qty <= 5) return `Only ${qty} left`;
    return null;
  }

  if (product.limited && product.stockQty === 1) return 'N°1 of 1';
  if (
    product.stockQty != null &&
    product.stockQty > 0 &&
    product.stockQty <= 5 &&
    product.stock !== 'out'
  ) {
    return `Only ${product.stockQty} left`;
  }
  return null;
}
