import {useLocation} from "react-router";
import { ShoppingBag } from "lucide-react";
import { useCartDrawer } from "~/contexts/cart-drawer-context";

// Floating bag shortcut — opens the same cart drawer as the header icon.
export function CartFab() {
  const pathname = useLocation().pathname;
  const {cartQuantity, open} = useCartDrawer();
  const count = cartQuantity;

  if (count === 0) return null;
  // Homepage / cart already expose the bag clearly — skip the duplicate FAB.
  if (pathname === "/" || pathname === "/cart" || pathname === "/checkout") {
    return null;
  }

  // On PDP, mobile sticky buy bar occupies the bottom — lift FAB above it (< lg only).
  const abovePdpBuyBar = pathname.startsWith("/products/");

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`View bag (${count} item${count === 1 ? "" : "s"})`}
      className={[
        "fixed z-[45] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:opacity-90 hover:shadow-xl",
        "right-[calc(1.5rem+env(safe-area-inset-right))]",
        abovePdpBuyBar
          ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]",
      ].join(" ")}
      style={{
        background: "var(--accent)",
        color: "var(--background)",
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
        {count}
      </span>
    </button>
  );
}
