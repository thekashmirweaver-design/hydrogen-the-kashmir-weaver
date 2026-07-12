import {Link, useRouteLoaderData} from "react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShoppingBag, ArrowRight, X } from "lucide-react";
import type { CartApiQueryFragment } from "storefrontapi.generated";
import type { RootLoader } from "~/root";
import { useFormatPrice } from "~/lib/currency-store";
import { CartLineItem } from "~/components/gulriza/CartLineItem";
import { CartPromoForms } from "~/components/gulriza/CartPromoForms";
import { CartTotals } from "~/components/gulriza/CartTotals";
import { getCartPromotionSummary } from "~/lib/cart-promotions";
import { checkoutLocale, toStorefrontCheckoutUrl } from "~/lib/resolve-checkout-url";
import { trackBeginCheckout } from "~/components/GoogleAnalytics";
import { useFocusTrap } from "~/hooks/use-focus-trap";
import { useBottomSheetDrag } from "~/hooks/use-bottom-sheet-drag";
import { lockScroll, unlockScroll } from "~/lib/scroll-lock";

const CLOSE_MS = 300;

export function CartDrawer({
  open,
  onClose,
  cart,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartApiQueryFragment | null;
}) {
  const root = useRouteLoaderData<RootLoader>("root");
  const lines = cart?.lines?.nodes ?? [];
  const count = cart?.totalQuantity ?? 0;
  const formatPrice = useFormatPrice();
  const promotion = getCartPromotionSummary(cart);
  const displayMoney =
    promotion.hasAdjustments && promotion.total
      ? promotion.total
      : promotion.subtotal;
  const displayTotalLabel = displayMoney
    ? formatPrice({
        amount: Number(displayMoney.amount),
        currencyCode: displayMoney.currencyCode,
      })
    : "—";
  const rawCheckoutUrl = cart?.checkoutUrl;
  const checkoutUrl = rawCheckoutUrl
    ? toStorefrontCheckoutUrl(
        rawCheckoutUrl,
        root?.consent?.checkoutDomain,
        checkoutLocale(root?.consent?.language, root?.consent?.country),
        root?.publicStoreUrl,
      )
    : undefined;
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  const {
    dragY,
    isDragging,
    isBottomSheet,
    isSidePanel,
    overlayOpacity,
    dragHandleProps,
  } = useBottomSheetDrag({
    enabled: open && visible,
    panelRef,
    onDismiss: requestClose,
  });

  const backdropOpacity = visible
    ? isBottomSheet && overlayOpacity != null
      ? overlayOpacity
      : 1
    : 0;

  const panelTransform = isBottomSheet
    ? visible
      ? `translateY(${dragY}px)`
      : "translateY(100%)"
    : visible
      ? "translateX(0)"
      : "translateX(100%)";

  useEffect(() => {
    if (!open) return;
    closingRef.current = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    lockScroll();
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
      cancelAnimationFrame(raf);
    };
  }, [open, requestClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your bag"
      onClick={requestClose}
      className="fixed inset-0 z-[100] flex items-end justify-center backdrop-blur-sm motion-reduce:transition-none md:items-stretch md:justify-end"
      style={{
        background: "var(--backdrop)",
        opacity: backdropOpacity,
        transition: isDragging
          ? "none"
          : "opacity 300ms ease-out",
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)))] w-full flex-col rounded-t-2xl border-t outline-none shadow-2xl motion-reduce:transition-none md:ml-auto md:h-full md:max-h-none md:w-full md:max-w-md md:rounded-none md:border-l md:border-t-0"
        style={{
          background: "var(--background)",
          borderColor: "var(--border)",
          transform: panelTransform,
          transformOrigin: isSidePanel ? "right center" : "center bottom",
          transition: isDragging
            ? "none"
            : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          className="shrink-0 select-none md:pointer-events-none"
          {...dragHandleProps}
        >
          <div
            className="mx-auto mt-3 h-1 w-10 rounded-full md:hidden"
            style={{ background: "var(--hairline)" }}
            aria-hidden
          />
          <div
            className="flex items-center justify-between border-b px-4 py-3.5 sm:px-5 sm:py-4 md:px-6 md:py-5"
            style={{ borderColor: "var(--border)" }}
          >
            <h2 className="font-display text-lg sm:text-xl md:text-2xl" style={{ fontWeight: 400 }}>
              Your Bag <span className="text-muted-foreground">({count})</span>
            </h2>
            <button
              onClick={requestClose}
              aria-label="Close bag"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition hover:border-accent hover:text-accent active:opacity-80 touch-manipulation"
              style={{ borderColor: "var(--border)" }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <X className="h-4 w-4" strokeWidth={1} />
            </button>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:px-6">
            <ShoppingBag className="mb-6 h-12 w-12 text-muted-foreground/30" strokeWidth={1} />
            <p className="text-sm font-medium text-muted-foreground">
              Your bag is empty.
            </p>
            <Link
              to="/collections/all"
              onClick={requestClose}
              className="group mt-10 flex w-full max-w-sm items-center justify-center gap-3 border py-3.5 transition-all duration-300 hover:opacity-90 sm:py-4"
              style={{ background: "var(--accent)", color: "var(--background)", borderColor: "var(--accent)" }}
            >
              <span className="tracked text-[0.75rem] font-medium uppercase tracking-[0.15em] sm:text-[0.8rem]">
                Shop all pieces
              </span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                strokeWidth={1.5}
              />
            </Link>
          </div>
        ) : (
          <>
            {/* Scrollable line items */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5">
              <ul className="flex flex-col">
                {lines.map((line) => (
                  <li key={line.id}>
                    <CartLineItem
                      line={line}
                      variant="drawer"
                      onNavigate={requestClose}
                      formatPrice={formatPrice}
                    />
                  </li>
                ))}
              </ul>
            </div>

            {/* Mobile: sticky footer — promo, total, checkout */}
            <div
              className="shrink-0 border-t px-4 pt-3 md:hidden"
              style={{
                borderColor: "var(--border)",
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
            >
              {promotion.hasAdjustments && (
                <div className="mb-3">
                  <CartTotals cart={cart} formatPrice={formatPrice} compact />
                </div>
              )}
              <CartPromoForms cart={cart} variant="drawer" collapsible />
              <div
                className="mt-3 flex items-center gap-3 border-t pt-3"
                style={{borderColor: "var(--border)"}}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                    Total
                  </p>
                  <p className="font-display truncate text-lg leading-tight">
                    {displayTotalLabel}
                  </p>
                </div>
                {checkoutUrl ? (
                  <a
                    href={checkoutUrl}
                    onClick={() => {
                      trackBeginCheckout(cart);
                      requestClose();
                    }}
                    className="tracked shrink-0 px-5 py-3.5 text-[0.7rem] uppercase tracking-[0.1em] transition hover:opacity-90 touch-manipulation"
                    style={{
                      background: "var(--accent)",
                      color: "var(--background)",
                    }}
                  >
                    Checkout
                  </a>
                ) : (
                  <Link
                    to="/cart"
                    onClick={requestClose}
                    className="tracked shrink-0 px-5 py-3.5 text-[0.7rem] uppercase tracking-[0.1em] transition hover:opacity-90 touch-manipulation"
                    style={{
                      background: "var(--accent)",
                      color: "var(--background)",
                    }}
                  >
                    View bag
                  </Link>
                )}
              </div>
              <p className="mt-2 text-center text-[0.6rem] leading-relaxed text-muted-foreground">
                Secure payment · Easy returns · Worldwide delivery
              </p>
              <button
                type="button"
                onClick={requestClose}
                className="tracked mt-1 w-full py-1 text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground touch-manipulation"
              >
                Continue shopping
              </button>
            </div>

            {/* Desktop drawer footer */}
            <div
              className="hidden shrink-0 space-y-3 border-t px-6 py-5 md:block"
              style={{ borderColor: "var(--border)" }}
            >
              <CartTotals cart={cart} formatPrice={formatPrice} compact />
              <CartPromoForms cart={cart} variant="drawer" collapsible />
              <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
                Shipping and taxes calculated at checkout.
              </p>
              {checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  onClick={() => {
                    trackBeginCheckout(cart);
                    requestClose();
                  }}
                  className="group flex w-full items-center justify-center gap-2 border py-3.5 transition-all duration-300 hover:opacity-90 touch-manipulation"
                  style={{
                    background: "var(--accent)",
                    color: "var(--background)",
                    borderColor: "var(--accent)",
                  }}
                >
                  <span className="tracked text-center text-[0.8rem] font-medium uppercase leading-snug tracking-[0.15em]">
                    Checkout
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </a>
              ) : (
                <Link
                  to="/cart"
                  onClick={requestClose}
                  className="group flex w-full items-center justify-center gap-2 border py-3.5 transition-all duration-300 hover:opacity-90 touch-manipulation"
                  style={{
                    background: "var(--accent)",
                    color: "var(--background)",
                    borderColor: "var(--accent)",
                  }}
                >
                  <span className="tracked text-center text-[0.8rem] font-medium uppercase leading-snug tracking-[0.15em]">
                    View bag
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </Link>
              )}
              <button
                type="button"
                onClick={requestClose}
                className="btn-secondary tracked w-full py-3.5 text-[0.75rem] uppercase tracking-[0.15em] text-foreground touch-manipulation"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
