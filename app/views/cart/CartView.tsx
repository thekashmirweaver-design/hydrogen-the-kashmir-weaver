import {Link, useRouteLoaderData} from 'react-router';
import {ArrowRight} from 'lucide-react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {RootLoader} from '~/root';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import {CartLineItem} from '~/components/gulriza/CartLineItem';
import {CartPromoForms} from '~/components/gulriza/CartPromoForms';
import {CartTotals} from '~/components/gulriza/CartTotals';
import {formatShopifyMoney} from '~/lib/format-money';
import {getCartPromotionSummary} from '~/lib/cart-promotions';
import {useLocalization} from '~/contexts/localization-context';
import {useLiveCart} from '~/lib/use-live-cart';
import {checkoutLocale, toStorefrontCheckoutUrl} from '~/lib/resolve-checkout-url';

export function CartView({cart: loaderCart}: {cart: CartApiQueryFragment | null}) {
  const root = useRouteLoaderData<RootLoader>('root');
  const {selectedCurrency} = useLocalization();
  const cart = useLiveCart(loaderCart, {
    marketCountry: selectedCurrency.countryCode,
  });
  const lines = cart?.lines?.nodes ?? [];
  const rawCheckoutUrl = cart?.checkoutUrl;
  const checkoutDomain = root?.consent?.checkoutDomain;
  const locale = checkoutLocale(root?.consent?.language, root?.consent?.country);
  const checkoutUrl = rawCheckoutUrl
    ? toStorefrontCheckoutUrl(
        rawCheckoutUrl,
        checkoutDomain,
        locale,
        root?.publicStoreUrl,
      )
    : undefined;

  const {subtotal, total, hasAdjustments} = getCartPromotionSummary(cart);
  const subtotalLabel = subtotal
    ? formatShopifyMoney(subtotal.amount, subtotal.currencyCode)
    : '—';
  const totalLabel = total
    ? formatShopifyMoney(total.amount, total.currencyCode)
    : subtotalLabel;
  const displayTotalLabel = hasAdjustments ? totalLabel : subtotalLabel;

  return (
    <div>
      <section className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 sm:pb-24 sm:pt-8 md:px-10 lg:pb-24">
        <Eyebrow>Your Selection</Eyebrow>
        <h1
          className="font-display mt-4 text-3xl leading-tight sm:mt-6 sm:text-4xl md:text-6xl"
          style={{fontWeight: 400}}
        >
          My Bag{' '}
          <span className="text-muted-foreground">({cart?.totalQuantity ?? 0})</span>
        </h1>

        {lines.length === 0 ? (
          <div className="mt-16 text-center sm:mt-24">
            <p className="text-muted-foreground">Your bag is quiet.</p>
            <Link to="/collections" className="tracked mt-8 inline-block text-accent">
              Discover the Collections →
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-10 sm:mt-16 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <div className="min-w-0">
              <Hairline />
              {lines.map((line) => (
                <div key={line.id}>
                  <CartLineItem line={line} variant="page" />
                  <Hairline />
                </div>
              ))}
            </div>

            <aside
              className="h-fit p-4 sm:p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:p-10"
              style={{background: 'var(--surface)'}}
            >
              <Eyebrow>Order Summary</Eyebrow>
              <div className="mt-6 space-y-3 text-sm sm:mt-8 sm:space-y-4">
                <CartTotals cart={cart} />
                <Row k="Shipping" v="Complimentary" />
                <Row k="Taxes" v="Calculated at checkout" />
              </div>
              <Hairline className="my-5 sm:my-6" />
              <Row
                k={<span className="tracked text-foreground">Total</span>}
                v={
                  <span className="font-display text-lg sm:text-xl">
                    {displayTotalLabel}
                  </span>
                }
              />
              <div className="mt-6 sm:mt-8">
                <CartPromoForms cart={cart} collapsible />
              </div>
              {checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  className="tracked mt-8 hidden w-full items-center justify-center py-4 transition hover:opacity-90 lg:flex"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--background)',
                  }}
                >
                  Proceed to Checkout
                </a>
              ) : (
                <span
                  className="tracked mt-8 hidden w-full cursor-not-allowed items-center justify-center py-4 opacity-50 lg:flex"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--background)',
                  }}
                >
                  Proceed to Checkout
                </span>
              )}
              <p className="mt-4 hidden text-xs text-muted-foreground lg:block">
                Secure payment · Easy returns · Worldwide delivery
              </p>
            </aside>
          </div>
        )}
      </section>

      {lines.length > 0 && checkoutUrl && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 lg:hidden"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--border)',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                Total
              </p>
              <p className="font-display text-lg">{displayTotalLabel}</p>
            </div>
            <a
              href={checkoutUrl}
              className="tracked shrink-0 px-6 py-3.5 text-[0.72rem] uppercase tracking-[0.12em] transition hover:opacity-90 touch-manipulation"
              style={{
                background: 'var(--accent)',
                color: 'var(--background)',
              }}
            >
              Checkout
            </a>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6 sm:py-32 md:px-10">
        <Reveal className="text-center">
          <Eyebrow>The Collections</Eyebrow>
          <h2
            className="font-display mt-6 text-2xl leading-[1.1] sm:text-3xl md:text-5xl"
            style={{fontWeight: 400}}
          >
            Discover every piece
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm text-muted-foreground sm:text-base">
            Explore our complete range of hand-woven Kashmiri pashmina, each crafted by a single
            master artisan.
          </p>
          <Link
            to="/collections"
            className="tracked mt-10 inline-flex w-full items-center justify-center gap-3 px-8 py-4 font-medium transition hover:opacity-90 sm:w-auto sm:px-10"
            style={{background: 'var(--accent)', color: 'var(--background)'}}
          >
            Explore Collections <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}

function Row({k, v}: {k: React.ReactNode; v: React.ReactNode}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
