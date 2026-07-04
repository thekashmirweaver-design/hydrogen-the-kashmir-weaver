import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {CartForm} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import {formatShopifyMoney} from '~/lib/format-money';
import {CartLineShade} from '~/components/gulriza/CartLineShade';
import {
  CartLineQuantityControls,
  CartLineRemoveButton,
} from '~/components/gulriza/CartLineQuantityControls';

export function CartView({cart}: {cart: CartApiQueryFragment | null}) {
  const lines = cart?.lines?.nodes ?? [];
  const subtotal = cart?.cost?.subtotalAmount;
  const checkoutUrl = cart?.checkoutUrl;
  const appliedCodes = cart?.discountCodes?.filter((c) => c.applicable) ?? [];

  return (
    <div>
      <section className="mx-auto max-w-[1400px] px-6 pt-32 pb-24 md:px-10">
        <Eyebrow>Your Selection</Eyebrow>
        <h1
          className="font-display mt-6 text-4xl leading-tight md:text-6xl"
          style={{fontWeight: 400}}
        >
          My Bag{' '}
          <span className="text-muted-foreground">({cart?.totalQuantity ?? 0})</span>
        </h1>

        {lines.length === 0 ? (
          <div className="mt-24 text-center">
            <p className="text-muted-foreground">Your bag is quiet.</p>
            <Link to="/collections" className="tracked mt-8 inline-block text-accent">
              Discover the Collections →
            </Link>
          </div>
        ) : (
          <div className="mt-16 grid grid-cols-1 gap-16 md:grid-cols-[1.5fr_1fr]">
            <div>
              <Hairline />
              {lines.map((line) => {
                const {merchandise, quantity, id: lineId, cost, attributes} = line;
                const {product, image, title} = merchandise;

                return (
                  <div key={lineId}>
                    <div className="grid grid-cols-[88px_1fr_auto] items-start gap-4 py-8 sm:grid-cols-[120px_1fr_auto] sm:gap-8">
                      <Link
                        to={`/products/${product.handle}`}
                        className="relative aspect-[4/5] w-[88px] overflow-hidden sm:w-[120px]"
                        style={{background: 'var(--surface)'}}
                      >
                        {image?.url && (
                          <img
                            src={image.url}
                            alt={image.altText ?? title}
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            to={`/products/${product.handle}`}
                            className="font-display text-lg break-words transition-colors hover:text-accent sm:text-xl"
                            style={{fontWeight: 400}}
                          >
                            {product.title}
                          </Link>
                          <CartLineRemoveButton lineIds={[lineId]} />
                        </div>

                        <div className="mt-2 text-sm">
                          {formatShopifyMoney(
                            merchandise.price.amount,
                            merchandise.price.currencyCode,
                          )}
                        </div>
                        <CartLineShade attributes={attributes} className="mt-2 text-sm text-muted-foreground" />
                        <div className="mt-5 flex items-center gap-4">
                          <CartLineQuantityControls
                            lineId={lineId}
                            quantity={quantity}
                            compact={false}
                          />
                        </div>
                      </div>
                      <div className="whitespace-nowrap text-sm">
                        {formatShopifyMoney(
                          cost.totalAmount.amount,
                          cost.totalAmount.currencyCode,
                        )}
                      </div>
                    </div>
                    <Hairline />
                  </div>
                );
              })}
            </div>

            <aside className="h-fit p-10" style={{background: 'var(--surface)'}}>
              <Eyebrow>Order Summary</Eyebrow>
              <div className="mt-8 space-y-4 text-sm">
                <Row
                  k="Subtotal"
                  v={
                    subtotal
                      ? formatShopifyMoney(subtotal.amount, subtotal.currencyCode)
                      : '—'
                  }
                />
                <Row k="Shipping" v="Complimentary" />
                <Row k="Taxes" v="Calculated at checkout" />
              </div>
              <Hairline className="my-6" />
              <Row
                k={<span className="tracked text-foreground">Total</span>}
                v={
                  <span className="font-display text-xl">
                    {subtotal
                      ? formatShopifyMoney(subtotal.amount, subtotal.currencyCode)
                      : '—'}
                  </span>
                }
              />
              <CartForm
                route="/cart"
                action={CartForm.ACTIONS.DiscountCodesUpdate}
                inputs={{discountCodes: appliedCodes.map((c) => c.code)}}
              >
                {(fetcher) => (
                  <div className="mt-8 flex gap-2">
                    <input
                      name="discountCode"
                      placeholder="Promo code"
                      className="flex-1 border bg-transparent px-3 py-2 text-xs uppercase tracking-[0.15em] focus:outline-none"
                      style={{borderColor: 'var(--border)'}}
                    />
                    <button
                      type="submit"
                      disabled={fetcher.state !== 'idle'}
                      className="tracked border px-4 py-2 text-xs transition hover:text-accent disabled:opacity-50"
                      style={{borderColor: 'var(--border)'}}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </CartForm>
              {appliedCodes.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Applied: {appliedCodes.map((c) => c.code).join(', ')}
                </p>
              )}
              <CartForm route="/cart" action={CartForm.ACTIONS.GiftCardCodesAdd}>
                {(fetcher) => (
                  <div className="mt-4 flex gap-2">
                    <input
                      name="giftCardCode"
                      placeholder="Gift card"
                      className="flex-1 border bg-transparent px-3 py-2 text-xs uppercase tracking-[0.15em] focus:outline-none"
                      style={{borderColor: 'var(--border)'}}
                    />
                    <button
                      type="submit"
                      disabled={fetcher.state !== 'idle'}
                      className="tracked border px-4 py-2 text-xs transition hover:text-accent disabled:opacity-50"
                      style={{borderColor: 'var(--border)'}}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </CartForm>
              {(cart?.appliedGiftCards?.length ?? 0) > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Gift cards applied
                </p>
              )}
              {checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  className="tracked mt-10 flex w-full items-center justify-center py-4 transition hover:opacity-90"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--background)',
                  }}
                >
                  Proceed to Checkout
                </a>
              ) : (
                <span
                  className="tracked mt-10 flex w-full cursor-not-allowed items-center justify-center py-4 opacity-50"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--background)',
                  }}
                >
                  Proceed to Checkout
                </span>
              )}
              <p className="mt-6 text-xs text-muted-foreground">
                Secure payment · Easy returns · Worldwide delivery
              </p>
            </aside>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1100px] px-6 py-32 md:px-10">
        <Reveal className="text-center">
          <Eyebrow>The Collections</Eyebrow>
          <h2
            className="font-display mt-6 text-3xl leading-[1.1] md:text-5xl"
            style={{fontWeight: 400}}
          >
            Discover every piece
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground">
            Explore our complete range of hand-woven Kashmiri pashmina, each crafted by a single
            master artisan.
          </p>
          <Link
            to="/collections"
            className="tracked mt-10 inline-flex w-full items-center justify-center gap-3 px-10 py-4 font-medium transition hover:opacity-90 sm:w-auto"
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
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}
