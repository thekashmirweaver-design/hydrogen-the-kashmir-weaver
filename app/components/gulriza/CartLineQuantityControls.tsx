import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import {CartForm} from '@shopify/hydrogen';
import {Minus, Plus, Trash2} from 'lucide-react';
import {useFetchers} from 'react-router';

function cartQtyFetcherKey(lineId: string, quantity: number) {
  return `cart-qty-${lineId}-${quantity}`;
}

function isLineQtyPending(lineId: string, fetchers: ReturnType<typeof useFetchers>) {
  return fetchers.some(
    (fetcher) =>
      fetcher.state !== 'idle' &&
      typeof fetcher.key === 'string' &&
      fetcher.key.startsWith(`cart-qty-${lineId}-`),
  );
}

export function CartLineQuantityControls({
  lineId,
  quantity,
  compact = true,
}: {
  lineId: string;
  quantity: number;
  /** Drawer uses tighter spacing; cart page uses roomier controls. */
  compact?: boolean;
}) {
  const fetchers = useFetchers();
  const pending = isLineQtyPending(lineId, fetchers);
  const prevQuantity = Math.max(0, quantity - 1);
  const nextQuantity = quantity + 1;

  const wrapClass = compact
    ? 'flex items-center gap-2 border px-2 py-1'
    : 'flex items-center gap-3 border px-3 py-1.5';
  const qtyClass = compact
    ? 'w-5 text-center text-xs'
    : 'w-6 text-center text-sm';

  return (
    <div className={wrapClass} style={{borderColor: 'var(--border)'}}>
      <CartLineUpdateButton
        lines={[{id: lineId, quantity: prevQuantity}]}
        fetcherKey={cartQtyFetcherKey(lineId, prevQuantity)}
        ariaLabel="Decrease quantity"
        disabled={quantity <= 1 || pending}
      >
        <Minus className="h-3 w-3" strokeWidth={1} />
      </CartLineUpdateButton>
      <span className={qtyClass}>{quantity}</span>
      <CartLineUpdateButton
        lines={[{id: lineId, quantity: nextQuantity}]}
        fetcherKey={cartQtyFetcherKey(lineId, nextQuantity)}
        ariaLabel="Increase quantity"
        disabled={pending}
      >
        <Plus className="h-3 w-3" strokeWidth={1} />
      </CartLineUpdateButton>
    </div>
  );
}

function CartLineUpdateButton({
  lines,
  fetcherKey,
  ariaLabel,
  disabled,
  children,
}: {
  lines: CartLineUpdateInput[];
  fetcherKey: string;
  ariaLabel: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      fetcherKey={fetcherKey}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {(fetcher) => (
        <button
          type="submit"
          aria-label={ariaLabel}
          disabled={disabled || fetcher.state !== 'idle'}
          className="text-muted-foreground transition hover:text-accent disabled:pointer-events-none disabled:opacity-30"
        >
          {children}
        </button>
      )}
    </CartForm>
  );
}

export function CartLineRemoveButton({lineIds}: {lineIds: string[]}) {
  return (
    <CartForm
      fetcherKey={[CartForm.ACTIONS.LinesRemove, ...lineIds].join('-')}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      {(fetcher) => (
        <button
          type="submit"
          aria-label="Remove item"
          disabled={fetcher.state !== 'idle'}
          className="shrink-0 text-muted-foreground transition hover:text-accent disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1} />
        </button>
      )}
    </CartForm>
  );
}
