import {Link, useLocation, useNavigate, useNavigation} from "react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, ShoppingBag, Menu, X, ChevronDown, Check, Globe } from "lucide-react";
import type { CartApiQueryFragment } from "storefrontapi.generated";
import { CartForm, useAnalytics } from "@shopify/hydrogen";
import { useLocalization } from "~/contexts/localization-context";
import type { ShopCurrencyOption } from "~/lib/localization";
import { Marquee } from "~/components/gulriza/Marquee";
import { SearchModal, lockScroll, unlockScroll } from "~/components/gulriza/SearchModal";
import { CartDrawer } from "~/components/gulriza/CartDrawer";
import { ShopifyAccount } from "~/components/gulriza/ShopifyAccount";
import { useFocusTrap } from "~/hooks/use-focus-trap";
import type {ShopSettings, NavItem} from "~/lib/shop-settings";

const NAV = [
  { to: "/collections/all", label: "Shop" },
  { to: "/collections", label: "Collections" },
  { to: "/heritage", label: "Heritage" },
  { to: "/craft", label: "Craft" },
  { to: "/journal", label: "Journal" },
  { to: "/concierge", label: "Concierge" },
] as const;

const MENU_CLOSE_MS = 300;

// Two-line brand lockup. Sizing/tracking/alignment come from `className` so the
// header (responsive) and the mobile menu (fixed) can share one markup.
function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display flex flex-col uppercase leading-[1.05] ${className}`}
      style={{ fontWeight: 300 }}
    >
      <span className="whitespace-nowrap">The Kashmir</span>
      <span className="whitespace-nowrap tracking-[0.2em] text-[0.85em] italic opacity-90">
        Weaver
      </span>
    </span>
  );
}

export function SiteHeader({
  transparent = false,
  cart = null,
  cartQuantity = 0,
  shopSettings,
  publicStoreDomain,
  publicAccessToken,
  customerAccessToken = null,
}: {
  transparent?: boolean;
  cart?: CartApiQueryFragment | null;
  cartQuantity?: number;
  shopSettings?: ShopSettings;
  publicStoreDomain: string;
  publicAccessToken: string;
  customerAccessToken?: string | null;
}) {
  const {publish} = useAnalytics();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const pathname = useLocation().pathname;
  const count = cartQuantity;
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuClosingRef = useRef(false);
  useFocusTrap(open, menuRef);

  // Animated close: play the exit transition, then unmount (mirrors SearchModal).
  const requestMenuClose = useCallback(() => {
    if (menuClosingRef.current) return;
    menuClosingRef.current = true;
    setMenuVisible(false);
    window.setTimeout(() => setOpen(false), MENU_CLOSE_MS);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile menu: lock body scroll, close on Escape, and trigger the entrance
  // transition on the next frame while open.
  useEffect(() => {
    if (!open) return;
    menuClosingRef.current = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        requestMenuClose();
        // Restore focus to the trigger synchronously. WebKit/Safari can swallow
        // the focus-trap's unmount-time restoration, so do it explicitly here
        // (mirrors the dropdown overlays' Escape behaviour).
        menuTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    lockScroll();
    const raf = requestAnimationFrame(() => setMenuVisible(true));
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
      cancelAnimationFrame(raf);
    };
  }, [open, requestMenuClose]);

  // Reset the animation/closing state once the panel is fully unmounted so the
  // next open replays the entrance transition from scratch.
  useEffect(() => {
    if (open) return;
    setMenuVisible(false);
    menuClosingRef.current = false;
  }, [open]);

  // Close the mobile menu whenever the route changes (instant unmount is fine).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const solid = !transparent || scrolled;
  const navItems: NavItem[] =
    shopSettings?.headerMenu?.length ? shopSettings.headerMenu : [...NAV];

  return (
    <>
      <div
        className="relative z-40 w-full bg-[var(--background)]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Marquee messages={shopSettings?.marquee} />
      </div>
      <div className="sticky top-0 z-50 h-0 w-full">
        <header
          className={`absolute inset-x-0 top-0 transition-all duration-700 ${
            solid ? "border-b backdrop-blur-md" : "border-b border-transparent"
          }`}
          style={{
            backgroundColor: solid ? "rgba(8,16,15,0.78)" : "transparent",
            borderColor: solid ? "var(--border)" : "transparent",
            paddingTop: scrolled ? "env(safe-area-inset-top)" : "0px",
          }}
        >
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 md:h-20 md:px-6 lg:px-8 xl:px-10">
            {/* LEFT: brand (all screens) */}
            <div className="flex shrink items-center min-w-0">
              <Link to="/" className="-ml-0.5 flex items-center">
                <BrandLockup className="text-left text-[0.85rem] tracking-[0.08em] min-[375px]:text-[0.95rem] min-[375px]:tracking-[0.1em] md:text-[1.25rem] md:tracking-[0.15em] lg:text-[1.5rem] lg:tracking-[0.2em]" />
              </Link>
            </div>

            {/* RIGHT: all nav (desktop) · control clusters */}
            <div className="flex flex-1 items-center justify-end gap-2 lg:gap-4 xl:gap-6">
              <nav className="hidden items-center gap-4 lg:flex xl:gap-7">
                {navItems.map((n) => {
                  const isShop = n.label === "Shop";
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={
                        isShop
                          ? "tracked animate-shimmer relative flex items-center justify-center rounded-full px-5 py-1.5 text-xs font-medium transition hover:opacity-80"
                          : "tracked text-foreground/90 transition hover:text-accent relative"
                      }
                      style={
                        isShop
                          ? { background: "var(--accent)", color: "var(--background)" }
                          : pathname === n.to
                            ? { color: "var(--accent)" }
                            : undefined
                      }
                    >
                      <span className="relative z-20">{n.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile/tablet cluster: Search → Currency → Cart → Hamburger */}
              <div className="flex items-center gap-0 lg:hidden">
                <button
                  aria-label="Search"
                  className="flex h-11 w-11 items-center justify-center text-foreground/80 transition hover:text-accent"
                  onClick={() => {
                    publish('custom_search_opened', {});
                    setSearchOpen(true);
                  }}
                >
                  <Search className="h-[18px] w-[18px]" strokeWidth={1} />
                </button>
                <CurrencyDropdown />
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  aria-label={count > 0 ? `Bag, ${count} item${count === 1 ? "" : "s"}` : "Bag"}
                  className="relative flex h-11 w-11 items-center justify-center text-foreground/80 transition hover:text-accent"
                >
                  <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1} />
                  {count > 0 && (
                    <span
                      className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-medium"
                      style={{ background: "var(--accent)", color: "var(--background)" }}
                    >
                      {count}
                    </span>
                  )}
                </button>
                <button
                  ref={menuTriggerRef}
                  className="-mr-2.5 flex h-11 w-11 items-center justify-center text-foreground/80 transition hover:text-accent"
                  aria-label="Open menu"
                  aria-expanded={open}
                  onClick={() => setOpen(true)}
                >
                  <Menu className="h-[18px] w-[18px]" strokeWidth={1} />
                </button>
              </div>

              {/* Desktop cluster: Currency → Search → Account → Cart */}
              <div className="hidden items-center gap-2 lg:flex xl:gap-4">
                <CurrencyDropdown />
                <button
                  aria-label="Search"
                  className="flex h-11 w-11 items-center justify-center text-foreground/80 transition hover:text-accent"
                  onClick={() => {
                    publish('custom_search_opened', {});
                    setSearchOpen(true);
                  }}
                >
                  <Search className="h-[18px] w-[18px]" strokeWidth={1} />
                </button>
                <ShopifyAccount
                  publicStoreDomain={publicStoreDomain}
                  publicAccessToken={publicAccessToken}
                  customerAccessToken={customerAccessToken}
                  className="flex h-11 w-11 items-center justify-center"
                />
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  aria-label={count > 0 ? `Bag, ${count} item${count === 1 ? "" : "s"}` : "Bag"}
                  className="relative flex h-11 w-11 items-center justify-center text-foreground/80 transition hover:text-accent"
                >
                  <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1} />
                  {count > 0 && (
                    <span
                      className="absolute right-1 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-medium"
                      style={{
                        background: "var(--accent)",
                        color: "var(--background)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {open && (
            <div
              ref={menuRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="fixed inset-x-0 top-0 z-50 flex h-[100dvh] flex-col outline-none transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none lg:hidden"
              style={{
                background: "var(--background)",
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
                opacity: menuVisible ? 1 : 0,
                transform: menuVisible ? "none" : "translateY(-12px)",
              }}
            >
              <div className="flex h-16 shrink-0 items-center justify-between px-4">
                <button
                  onClick={requestMenuClose}
                  aria-label="Close menu"
                  className="-ml-2.5 flex h-11 w-11 items-center justify-center"
                >
                  <X className="h-5 w-5" strokeWidth={1} />
                </button>
                <BrandLockup className="items-center text-center text-xl tracking-[0.3em]" />
                <button
                  onClick={() => {
                    requestMenuClose();
                    publish('custom_search_opened', {});
                    setSearchOpen(true);
                  }}
                  aria-label="Search"
                  className="-mr-2.5 flex h-11 w-11 items-center justify-center"
                >
                  <Search className="h-5 w-5" strokeWidth={1} />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-8 pb-12 pt-8">
                {navItems.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={requestMenuClose}
                    className="font-display text-3xl tracking-wide transition hover:text-accent"
                    style={pathname === n.to ? { color: "var(--accent)" } : undefined}
                  >
                    {n.label}
                  </Link>
                ))}
                <Link
                  to="/account/login"
                  onClick={requestMenuClose}
                  className="font-display text-3xl tracking-wide transition hover:text-accent"
                >
                  Account
                </Link>
              </nav>
            </div>
          )}

          <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
          <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} />
        </header>
      </div>
    </>
  );
}

function CurrencyDropdown() {
  const {currencies, selectedCurrency} = useLocalization();
  const {pathname, search} = useLocation();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const displayCode = pendingCode ?? selectedCurrency.code;
  const isUpdating = pendingCode != null || navigation.state !== "idle";

  useEffect(() => {
    if (navigation.state === "idle") {
      setPendingCode(null);
    }
  }, [navigation.state, selectedCurrency.code]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = q
    ? currencies.filter((c) =>
        [c.code, c.symbol, c.name].some((field) => field.toLowerCase().includes(q)),
      )
    : currencies;

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Select currency, current ${displayCode}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-auto min-w-11 items-center justify-center gap-1.5 px-1.5 text-xs uppercase tracking-[0.25em] text-foreground/90 transition hover:text-accent focus:outline-none lg:justify-start"
        style={{opacity: isUpdating ? 0.65 : 1}}
      >
        <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={1} aria-hidden />
        <span>{displayCode}</span>
        <ChevronDown
          className="hidden h-3.5 w-3.5 shrink-0 transition-transform lg:block"
          strokeWidth={1}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      <div
        className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border py-2 shadow-2xl transition-all duration-300 ease-out origin-top-right"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          opacity: open ? 1 : 0,
          transform: open ? "scale(1) translateY(0)" : "scale(0.95) translateY(-8px)",
          pointerEvents: open ? "auto" : "none",
          visibility: open ? "visible" : "hidden",
        }}
      >
        <div
          className="mx-2 mb-2 flex items-center gap-2 rounded-md border px-3 pb-2 pt-2"
          style={{ borderColor: "var(--border)", background: "var(--background)" }}
        >
          <Search
            className="h-3.5 w-3.5 shrink-0"
            strokeWidth={1}
            style={{ color: "var(--muted-foreground)" }}
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded={open}
            aria-controls="currency-listbox"
            aria-label="Search currency"
            placeholder="Search currency…"
            className="w-full bg-transparent text-xs tracking-wide text-foreground placeholder:text-[var(--muted-foreground)] focus:outline-none"
          />
        </div>
        {results.length === 0 ? (
          <p
            className="px-3 py-6 text-center text-[0.7rem] tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            No currencies found
          </p>
        ) : (
          <ul
            id="currency-listbox"
            role="listbox"
            aria-label="Currency"
            className="max-h-[60vh] overflow-y-auto px-2 pb-1"
          >
            {results.map((c) => (
              <CurrencyOption
                key={c.code}
                option={c}
                active={c.code === displayCode}
                pathname={pathname}
                search={search}
                onSelect={() => {
                  setPendingCode(c.code);
                  setOpen(false);
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CurrencyOption({
  option,
  active,
  pathname,
  search,
  onSelect,
}: {
  option: ShopCurrencyOption;
  active: boolean;
  pathname: string;
  search: string;
  onSelect: () => void;
}) {
  const navigate = useNavigate();
  const redirectTo = buildMarketRedirect(pathname, search, option.countryCode);

  return (
    <li role="option" aria-selected={active}>
      <CartForm
        fetcherKey={`market-${option.countryCode}`}
        route="/cart"
        action={CartForm.ACTIONS.BuyerIdentityUpdate}
        inputs={{
          buyerIdentity: {
            countryCode: option.countryCode,
          },
        }}
      >
        {(fetcher) => (
          <button
            type="submit"
            disabled={active || fetcher.state !== "idle"}
            onClick={() => {
              onSelect();
              navigate(redirectTo, {replace: true, preventScrollReset: true});
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-all duration-200 hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none disabled:opacity-50"
            style={{
              color: active ? "var(--accent)" : "var(--foreground)",
              backgroundColor: active ? "var(--surface-2)" : "transparent",
            }}
          >
            <span className="w-5 shrink-0 text-center text-sm font-light">{option.symbol}</span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span
                className="text-xs font-medium tracking-[0.1em]"
                style={{ color: active ? "var(--accent)" : "var(--foreground)" }}
              >
                {option.code}
              </span>
              <span
                className="truncate text-[0.7rem]"
                style={{
                  color: active ? "var(--accent)" : "var(--muted-foreground)",
                  opacity: active ? 0.8 : 1,
                }}
              >
                {option.name}
              </span>
            </span>
            {active && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />}
          </button>
        )}
      </CartForm>
    </li>
  );
}

function buildMarketRedirect(pathname: string, search: string, countryCode: string) {
  const params = new URLSearchParams(search);
  params.set("country", countryCode);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
