import {Link} from "react-router";
import {useLocation} from "react-router";
import { ShoppingBag } from "lucide-react";

// Floating bag shortcut: links to /cart when the bag has items, hidden on cart
// and checkout pages.
export function CartFab({ cartQuantity = 0 }: { cartQuantity?: number }) {
  const pathname = useLocation().pathname;
  const count = cartQuantity;

  if (count === 0) return null;
  if (pathname === "/cart" || pathname === "/checkout") return null;

  return (
    <Link
      to="/cart"
      aria-label={`View bag (${count} item${count === 1 ? "" : "s"})`}
      className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:opacity-90 hover:shadow-xl"
      style={{
        background: "var(--accent)",
        color: "var(--background)",
        bottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        right: "calc(1.5rem + env(safe-area-inset-right))",
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
    </Link>
  );
}
