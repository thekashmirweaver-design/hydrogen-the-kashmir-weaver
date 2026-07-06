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

const inputClass =
  'min-h-11 w-full flex-1 border bg-transparent px-3 py-2 text-base uppercase tracking-[0.15em] focus:outline-none';
const buttonClass =
  'tracked min-h-11 w-full border px-4 py-2 text-xs transition hover:text-accent disabled:opacity-50 sm:w-auto';
const compactInputClass =
  'min-h-10 w-full flex-1 border bg-transparent px-3 py-2 text-[0.72rem] uppercase tracking-[0.12em] focus:outline-none';
const compactButtonClass =
  'tracked min-h-10 w-full shrink-0 border px-3 py-2 text-[0.65rem] uppercase tracking-[0.1em] transition hover:text-accent disabled:opacity-50 sm:w-auto';

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
  compact = false,
  collapsible = false,
}: {
  cart: CartApiQueryFragment | null;
  compact?: boolean;
  /** Collapsed disclosure — promo fields hidden until expanded. */
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const {appliedDiscountCodes, rejectedDiscountCodes, appliedGiftCards} =
    getCartPromotionSummary(cart);

  const fieldInput = compact ? compactInputClass : inputClass;
  const fieldButton = compact ? compactButtonClass : buttonClass;
  const summaryLabel = promoSummaryLabel(appliedDiscountCodes, appliedGiftCards);

  const forms = (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
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
                <div
                  className={
                    compact
                      ? 'flex flex-row gap-2'
                      : 'flex flex-col gap-2 sm:flex-row'
                  }
                >
                  <input
                    name="discountCode"
                    placeholder="Promo code"
                    aria-label="Promo code"
                    autoComplete="off"
                    className={fieldInput}
                    style={{borderColor: 'var(--border)'}}
                  />
                  <button
                    type="submit"
                    disabled={fetcher.state !== 'idle'}
                    className={fieldButton}
                    style={{borderColor: 'var(--border)'}}
                  >
                    Apply
                  </button>
                </div>
                {rejected.length > 0 && (
                  <p className="mt-2 text-xs text-accent" role="alert">
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
        <CartForm route="/cart" action={CartForm.ACTIONS.GiftCardCodesAdd}>
          {(fetcher) => {
            const error = cartActionErrorMessage(
              (fetcher.data as CartActionData | undefined)?.errors,
            );

            return (
              <>
                <div
                  className={
                    compact
                      ? 'flex flex-row gap-2'
                      : 'flex flex-col gap-2 sm:flex-row'
                  }
                >
                  <input
                    name="giftCardCode"
                    placeholder="Gift card"
                    aria-label="Gift card code"
                    autoComplete="off"
                    className={fieldInput}
                    style={{borderColor: 'var(--border)'}}
                  />
                  <button
                    type="submit"
                    disabled={fetcher.state !== 'idle'}
                    className={fieldButton}
                    style={{borderColor: 'var(--border)'}}
                  >
                    Apply
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-xs text-accent" role="alert">
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

  return (
    <div className="border-t pt-3" style={{borderColor: 'var(--border)'}}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="cart-promo-panel"
        onClick={() => setExpanded((open) => !open)}
        className="tracked flex w-full items-center justify-between gap-3 text-left text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors duration-200 hover:text-foreground touch-manipulation"
      >
        <span className="min-w-0 truncate">{summaryLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            expanded ? 'rotate-180' : ''
          }`}
          strokeWidth={1}
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
            className={`mt-3 ${contentMotion} ${
              expanded
                ? 'translate-y-0 opacity-100'
                : '-translate-y-1 opacity-0'
            }`}
          >
            {forms}
          </div>
        </div>
      </div>
    </div>
  );
}
