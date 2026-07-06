import {useState} from 'react';
import {CartForm} from '@shopify/hydrogen';
import {ChevronDown} from 'lucide-react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {
  cartActionErrorMessage,
  getCartPromotionSummary,
} from '~/lib/cart-promotions';

type CartActionData = {
  cart?: CartApiQueryFragment | null;
  errors?: Array<{message?: string | null}>;
};

type PromoVariant = 'page' | 'drawer';

const styles = {
  page: {
    input:
      'min-h-11 w-full min-w-0 flex-1 border bg-transparent px-3 py-2.5 text-base tracking-[0.04em] placeholder:text-muted-foreground focus:border-[var(--accent)] focus:outline-none',
    button:
      'btn-secondary tracked min-h-11 w-full shrink-0 px-5 py-2.5 text-xs uppercase tracking-[0.12em] disabled:opacity-50 sm:w-auto',
    row: 'flex flex-col gap-2 sm:flex-row sm:items-stretch',
    stack: 'space-y-4',
  },
  drawer: {
    input:
      'min-h-11 w-full min-w-0 flex-1 border bg-transparent px-3 py-2.5 text-sm tracking-[0.03em] placeholder:text-muted-foreground focus:border-[var(--accent)] focus:outline-none',
    button:
      'btn-secondary tracked min-h-11 min-w-[5.25rem] shrink-0 px-4 py-2.5 text-xs uppercase tracking-[0.1em] disabled:opacity-50',
    row: 'flex items-stretch gap-2',
    stack: 'space-y-3',
  },
} as const;

function promoSummaryLabel(
  appliedDiscountCodes: string[],
  appliedGiftCards: Array<{lastCharacters?: string | null}>,
) {
  if (appliedDiscountCodes.length > 0 && appliedGiftCards.length > 0) {
    return 'Promos & gift cards applied';
  }
  if (appliedDiscountCodes.length > 0) {
    return appliedDiscountCodes.length === 1
      ? `Promo: ${appliedDiscountCodes[0]}`
      : `${appliedDiscountCodes.length} promos applied`;
  }
  if (appliedGiftCards.length > 0) {
    return appliedGiftCards.length === 1
      ? `Gift card ···· ${appliedGiftCards[0].lastCharacters ?? ''}`
      : `${appliedGiftCards.length} gift cards applied`;
  }
  return 'Add promo or gift card';
}

export function CartPromoForms({
  cart,
  variant = 'page',
  collapsible = false,
  /** @deprecated Use variant="drawer" instead */
  compact = false,
}: {
  cart: CartApiQueryFragment | null;
  variant?: PromoVariant;
  collapsible?: boolean;
  compact?: boolean;
}) {
  const resolvedVariant: PromoVariant =
    variant === 'page' && compact ? 'drawer' : variant;
  const [expanded, setExpanded] = useState(false);
  const {appliedDiscountCodes, rejectedDiscountCodes, appliedGiftCards} =
    getCartPromotionSummary(cart);

  const s = styles[resolvedVariant];
  const summaryLabel = promoSummaryLabel(appliedDiscountCodes, appliedGiftCards);
  const hasApplied =
    appliedDiscountCodes.length > 0 || appliedGiftCards.length > 0;

  const forms = (
    <div className={s.stack}>
      <div>
        <p
          className={
            resolvedVariant === 'drawer'
              ? 'mb-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground'
              : 'sr-only'
          }
        >
          Promo code
        </p>
        <CartForm
          route="/cart"
          action={CartForm.ACTIONS.DiscountCodesUpdate}
          inputs={{discountCodes: appliedDiscountCodes}}
        >
          {(fetcher) => {
            const fetcherCart = (fetcher.data as CartActionData | undefined)?.cart;
            const rejectedFromFetcher = fetcherCart
              ? getCartPromotionSummary(fetcherCart).rejectedDiscountCodes
              : [];
            const rejected = rejectedFromFetcher.length
              ? rejectedFromFetcher
              : rejectedDiscountCodes;

            return (
              <>
                <div className={s.row}>
                  <input
                    name="discountCode"
                    placeholder="Promo code"
                    aria-label="Promo code"
                    autoComplete="off"
                    className={s.input}
                    style={{borderColor: 'var(--border)'}}
                  />
                  <button
                    type="submit"
                    disabled={fetcher.state !== 'idle'}
                    className={s.button}
                  >
                    Apply
                  </button>
                </div>
                {rejected.length > 0 && (
                  <p className="mt-2 text-xs leading-relaxed text-accent" role="alert">
                    {rejected.length === 1
                      ? `"${rejected[0]}" isn't valid for this bag. Check the code, dates, and eligible items.`
                      : `These codes aren't valid for this bag: ${rejected.join(', ')}.`}
                  </p>
                )}
              </>
            );
          }}
        </CartForm>
        {appliedDiscountCodes.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Applied: {appliedDiscountCodes.join(', ')}
          </p>
        )}
      </div>

      <div>
        <p
          className={
            resolvedVariant === 'drawer'
              ? 'mb-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground'
              : 'sr-only'
          }
        >
          Gift card
        </p>
        <CartForm route="/cart" action={CartForm.ACTIONS.GiftCardCodesAdd}>
          {(fetcher) => {
            const error = cartActionErrorMessage(
              (fetcher.data as CartActionData | undefined)?.errors,
            );

            return (
              <>
                <div className={s.row}>
                  <input
                    name="giftCardCode"
                    placeholder="Gift card"
                    aria-label="Gift card code"
                    autoComplete="off"
                    className={s.input}
                    style={{borderColor: 'var(--border)'}}
                  />
                  <button
                    type="submit"
                    disabled={fetcher.state !== 'idle'}
                    className={s.button}
                  >
                    Apply
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-xs leading-relaxed text-accent" role="alert">
                    {error}
                  </p>
                )}
              </>
            );
          }}
        </CartForm>
        {appliedGiftCards.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Gift cards applied
            {appliedGiftCards.map((g) => ` ···· ${g.lastCharacters}`).join('')}
          </p>
        )}
      </div>
    </div>
  );

  if (!collapsible) return forms;

  const panelMotion =
    'transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';
  const contentMotion =
    'transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

  const toggleClass =
    resolvedVariant === 'drawer'
      ? 'flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors duration-200 hover:text-foreground touch-manipulation'
      : 'tracked flex w-full items-center justify-between gap-3 text-left text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors duration-200 hover:text-foreground touch-manipulation';

  return (
    <div
      className={resolvedVariant === 'drawer' ? '' : 'border-t pt-3'}
      style={resolvedVariant === 'drawer' ? undefined : {borderColor: 'var(--border)'}}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="cart-promo-panel"
        onClick={() => setExpanded((open) => !open)}
        className={toggleClass}
      >
        <span className="min-w-0 truncate">{summaryLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            expanded ? 'rotate-180' : ''
          }`}
          strokeWidth={1.25}
          aria-hidden
        />
      </button>
      <div
        id="cart-promo-panel"
        role="region"
        aria-hidden={!expanded}
        className={`grid ${panelMotion} ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div
          className={`min-h-0 overflow-hidden ${expanded ? '' : 'pointer-events-none'}`}
        >
          <div
            className={`${resolvedVariant === 'drawer' ? 'pt-3' : 'mt-3'} ${contentMotion} ${
              expanded
                ? 'translate-y-0 opacity-100'
                : '-translate-y-1 opacity-0'
            }`}
          >
            {forms}
          </div>
        </div>
      </div>
      {!expanded && hasApplied ? (
        <p className="mt-1 truncate text-xs text-accent">{summaryLabel}</p>
      ) : null}
    </div>
  );
}
