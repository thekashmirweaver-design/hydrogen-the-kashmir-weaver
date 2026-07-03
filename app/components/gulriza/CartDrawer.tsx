import {Link} from "react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShoppingBag, Trash2, ArrowRight, X, Minus, Plus } from "lucide-react";
import type { CartLineUpdateInput } from "@shopify/hydrogen/storefront-api-types";
import { CartForm } from "@shopify/hydrogen";
import type { CartApiQueryFragment } from "storefrontapi.generated";
import type { Money } from "~/models/types";
import { useFormatPrice } from "~/lib/currency-store";
import { useFocusTrap } from "~/hooks/use-focus-trap";

const CLOSE_MS = 300;

function toMoney(m: { amount: string; currencyCode: string }): Money {
  return { amount: Number(m.amount), currencyCode: m.currencyCode };
}

// Slide-over bag drawer wired to the Hydrogen cart. Line remove and quantity
// updates go through CartForm; totals come from the cart query fragment.
export function CartDrawer({
  open,
  onClose,
  cart,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartApiQueryFragment | null;
}) {
  const lines = cart?.lines?.nodes ?? [];
  const count = cart?.totalQuantity ?? 0;
  const formatPrice = useFormatPrice();
  const subtotal = cart?.cost?.subtotalAmount;
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

  useEffect(() => {
    if (!open) return;
    closingRef.current = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
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
      className="fixed inset-0 z-[100] flex justify-end backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none"
      style={{ background: "rgba(8,16,15,0.86)", opacity: visible ? 1 : 0 }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{
          background: "var(--background)",
          borderColor: "var(--border)",
          transform: visible ? "none" : "translateX(100%)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-5"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="font-display text-2xl" style={{ fontWeight: 400 }}>
            Your Bag <span className="text-muted-foreground">({count})</span>
          </h2>
          <button
            onClick={requestClose}
            aria-label="Close bag"
            className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground transition hover:border-accent hover:text-accent"
            style={{ borderColor: "var(--border)" }}
          >
            <X className="h-4 w-4" strokeWidth={1} />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="mb-6 h-12 w-12 text-muted-foreground/30" strokeWidth={1} />
            <p className="text-sm text-muted-foreground font-medium">
              Your bag is beautifully empty.
            </p>
            <Link
              to="/collections/all"
              onClick={requestClose}
              className="group mt-10 flex w-full items-center justify-center gap-3 border py-4 transition-all duration-300 hover:opacity-90"
              style={{ background: "#ceac6c", color: "var(--background)", borderColor: "#ceac6c" }}
            >
              <span className="tracked text-[0.8rem] font-medium uppercase tracking-[0.15em]">
                Discover Collections
              </span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                strokeWidth={1.5}
              />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-hidden px-6 py-5">
              <ul className="flex flex-col">
                {lines.map((line) => {
                  const { merchandise, quantity, id: lineId } = line;
                  const { product, image, title } = merchandise;
                  const prevQuantity = Math.max(0, quantity - 1);
                  const nextQuantity = quantity + 1;

                  return (
                    <li
                      key={lineId}
                      className="flex gap-4 border-b py-5 first:pt-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <Link
                        to={`/products/${product.handle}`}
                        onClick={requestClose}
                        className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden"
                        style={{ background: "var(--surface)" }}
                      >
                        {image?.url && (
                          <img
                            src={image.url}
                            alt={image.altText ?? title}
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 hover:scale-105"
                          />
                        )}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            to={`/products/${product.handle}`}
                            onClick={requestClose}
                            className="font-display text-lg leading-snug transition-colors hover:text-accent"
                          >
                            {product.title}
                          </Link>
                          <CartLineRemoveButton lineIds={[lineId]} />
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-3">
                          <div
                            className="flex items-center gap-2 border px-2 py-1"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <CartLineUpdateButton lines={[{ id: lineId, quantity: prevQuantity }]}>
                              <button
                                aria-label="Decrease quantity"
                                disabled={quantity <= 1}
                                className="text-muted-foreground transition hover:text-accent disabled:pointer-events-none disabled:opacity-30"
                              >
                                <Minus className="h-3 w-3" strokeWidth={1} />
                              </button>
                            </CartLineUpdateButton>
                            <span className="w-5 text-center text-xs">{quantity}</span>
                            <CartLineUpdateButton lines={[{ id: lineId, quantity: nextQuantity }]}>
                              <button
                                aria-label="Increase quantity"
                                className="text-muted-foreground transition hover:text-accent disabled:pointer-events-none disabled:opacity-30"
                              >
                                <Plus className="h-3 w-3" strokeWidth={1} />
                              </button>
                            </CartLineUpdateButton>
                          </div>
                          <span className="text-sm">
                            {formatPrice(toMoney(line.cost.totalAmount))}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="space-y-4 border-t px-6 py-5" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
                  Subtotal
                </span>
                <span className="font-display text-lg">
                  {subtotal ? formatPrice(toMoney(subtotal)) : "—"}
                </span>
              </div>
              <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
                Shipping and taxes calculated at checkout.
              </p>
              <Link
                to="/cart"
                onClick={requestClose}
                className="group flex w-full items-center justify-center gap-3 border py-4 transition-all duration-300 hover:opacity-90"
                style={{
                  background: "#ceac6c",
                  color: "var(--background)",
                  borderColor: "#ceac6c",
                }}
              >
                <span className="tracked text-[0.8rem] font-medium uppercase tracking-[0.15em]">
                  View Bag & Checkout
                </span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
              <button
                onClick={requestClose}
                className="tracked w-full border py-4 text-[0.75rem] uppercase tracking-[0.15em] text-foreground transition-colors duration-300 hover:bg-foreground hover:text-background"
                style={{ borderColor: "var(--border)" }}
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

function CartLineRemoveButton({ lineIds }: { lineIds: string[] }) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{ lineIds }}
    >
      <button
        type="submit"
        aria-label="Remove item"
        className="shrink-0 text-muted-foreground transition hover:text-accent"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1} />
      </button>
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{ lines }}
    >
      {children}
    </CartForm>
  );
}

function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join("-");
}
