import {useCallback, useState} from "react";
import {useLocation} from "react-router";
import {EllipsisVertical, ShoppingBag, X} from "lucide-react";
import {useCartDrawer} from "~/contexts/cart-drawer-context";
import {CONTACT_HREFS} from "~/lib/contact";
import {WhatsAppIcon} from "~/components/gulriza/WhatsAppIcon";

export function FabSpeedDial() {
  const pathname = useLocation().pathname;
  const {cartQuantity, open: openCart} = useCartDrawer();
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((o) => !o), []);
  const close = useCallback(() => setIsOpen(false), []);

  const abovePdpBuyBar = pathname.startsWith("/products/");

  const showCart =
    cartQuantity > 0 &&
    pathname !== "/" &&
    pathname !== "/cart" &&
    pathname !== "/checkout";

  const handleWhatsApp = useCallback(() => {
    window.open(CONTACT_HREFS.whatsapp, "_blank", "noopener,noreferrer");
    close();
  }, [close]);

  const handleCart = useCallback(() => {
    openCart();
    close();
  }, [openCart, close]);

  // WhatsApp-only → render a simple direct link (no speed dial needed).
  if (!showCart) {
    return (
      <a
        href={CONTACT_HREFS.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Message on WhatsApp"
        className="fixed z-[45] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:opacity-90 hover:shadow-xl"
        style={{
          background: "var(--accent)",
          color: "var(--background)",
          right: "calc(1.5rem + env(safe-area-inset-right))",
          bottom: "calc(5rem + env(safe-area-inset-bottom))",
        }}
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            animation: "fab-pulse-ring 2s ease-out infinite",
            border: "2px solid var(--accent)",
          }}
        />
        <WhatsAppIcon className="h-5 w-5" />
      </a>
    );
  }

  const childBase = [
    "absolute flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
  ].join(" ");

  return (
    <div
      className="fixed z-[45] flex flex-col items-center"
      style={{
        right: "calc(1.5rem + env(safe-area-inset-right))",
        bottom: abovePdpBuyBar
          ? "calc(5.25rem + env(safe-area-inset-bottom))"
          : "calc(1.5rem + env(safe-area-inset-bottom))",
      }}
    >
      {/* WhatsApp child — at the top of the stack */}
      <button
        type="button"
        onClick={handleWhatsApp}
        aria-label="Message on WhatsApp"
        className={childBase}
        style={{
          background: "var(--accent)",
          color: "var(--background)",
          bottom: "calc(100% + 0.75rem)",
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.5) translateY(0.5rem)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <WhatsAppIcon className="h-5 w-5" />
      </button>

      {/* Cart child — second from top */}
      <button
        type="button"
        onClick={handleCart}
        aria-label={`View bag (${cartQuantity} item${cartQuantity === 1 ? "" : "s"})`}
        className={childBase}
        style={{
          background: "var(--accent)",
          color: "var(--background)",
          bottom: "calc(200% + 1.5rem)",
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.5) translateY(0.5rem)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <ShoppingBag className="h-5 w-5" strokeWidth={1.25} />
        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium"
          style={{
            background: "var(--foreground)",
            color: "var(--background)",
            boxShadow: "0 0 0 2px var(--accent)",
          }}
        >
          {cartQuantity}
        </span>
      </button>

      {/* Main toggle button */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? "Close" : "Quick actions"}
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:opacity-90 hover:shadow-xl"
        style={{
          background: "var(--accent)",
          color: "var(--background)",
        }}
      >
        {isOpen ? <X className="h-5 w-5" strokeWidth={1.25} /> : <EllipsisVertical className="h-5 w-5" strokeWidth={1.25} />}
      </button>
    </div>
  );
}
