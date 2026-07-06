import {Link, useLocation, useNavigate, useNavigation} from "react-router";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Search, ShoppingBag, Menu, X, ChevronDown, Check, Globe } from "lucide-react";
import type { CartApiQueryFragment } from "storefrontapi.generated";
import { CartForm, useAnalytics } from "@shopify/hydrogen";
import { useLocalization } from "~/contexts/localization-context";
import type { ShopCurrencyOption } from "~/lib/localization";
import { Marquee } from "~/components/gulriza/Marquee";
import { SearchModal } from "~/components/gulriza/SearchModal";
import { lockScroll, unlockScroll } from "~/lib/scroll-lock";
import { CartDrawer } from "~/components/gulriza/CartDrawer";
import { ShopifyAccount } from "~/components/gulriza/ShopifyAccount";
import { useFocusTrap } from "~/hooks/use-focus-trap";
import type {ShopSettings, NavItem} from "~/lib/shop-settings";
import brandMark from "~/assets/brand-mark.png";

const NAV = [
  { to: "/collections/all", label: "Shop" },
  { to: "/collections", label: "Collections" },
  { to: "/heritage", label: "Heritage" },
  { to: "/craft", label: "Craft" },
  { to: "/journal", label: "Journal" },
  { to: "/concierge", label: "Concierge" },
] as const;

const MENU_CLOSE_MS = 300;
const CURRENCY_SHEET_CLOSE_MS = 220;
const LG_MEDIA_QUERY = "(min-width: 1024px)";

function subscribeMediaQuery(query: string, callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function useIsLgUp() {
  return useSyncExternalStore(
    (callback) => subscribeMediaQuery(LG_MEDIA_QUERY, callback),
    () => window.matchMedia(LG_MEDIA_QUERY).matches,
    () => true,
  );
}

// Two-line brand lockup. Sizing/tracking/alignment come from `className` so the
// header (responsive) and the mobile menu (fixed) can share one markup. Kept
// deliberately still — no motion, no bars — just fine serif type, generous
// tracking, and a muted gold second line, like an engraved maison plaque.
function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display flex flex-col uppercase leading-[1.15] font-semibold ${className}`}
    >
      <span className="whitespace-nowrap">The Kashmir</span>
      <span
        className="mt-0.5 whitespace-nowrap text-[0.72em] font-bold not-italic tracking-[0.5em] opacity-95 transition-opacity duration-500 group-hover:opacity-100"
        style={{ color: "var(--accent)" }}
      >
        Weaver
      </span>
    </span>
  );
}

// The loom-knot emblem. A quiet still image — sized purely via `className` so it
// can sit inline with the header lockup.
function BrandMark({ className = "" }: { className?: string }) {
  return (
    <img
      src={brandMark}
      alt=""
      aria-hidden
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

// Wordmark ↔ emblem on mobile; emblem + sliding lockup on desktop.
function AnimatedHeaderBrand({ condensed }: { condensed: boolean }) {
  const brandMotion =
    "transition-[opacity,transform,max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

  return (
    <Link
      to="/"
      aria-label="The Kashmir Weaver"
      className={`relative flex shrink-0 items-center overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        condensed
          ? "h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9"
          : "h-9 w-[7.25rem] min-[390px]:w-[8rem] md:h-10 md:w-[10rem] lg:h-11 lg:w-auto"
      }`}
    >
      <span
        aria-hidden={!condensed}
        className={`absolute inset-0 flex items-center lg:hidden ${brandMotion} ${
          condensed
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-90 opacity-0"
        }`}
      >
        <BrandMark className="h-7 w-7 md:h-8 md:w-8" />
      </span>
      <span
        aria-hidden={condensed}
        className={`absolute inset-0 flex items-center lg:hidden ${brandMotion} ${
          condensed
            ? "pointer-events-none translate-y-1 opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        <BrandLockup className="w-max text-left text-[0.8rem] tracking-[0.06em] min-[390px]:text-[0.92rem] min-[390px]:tracking-[0.08em] md:text-[1.1rem] md:tracking-[0.12em]" />
      </span>

      <span className="hidden min-w-0 items-center gap-3 lg:flex">
        <BrandMark className="h-10 w-10 shrink-0" />
        <span
          aria-hidden={condensed}
          className={`overflow-hidden ${brandMotion} ${
            condensed
              ? "max-w-0 opacity-0 -translate-x-2"
              : "max-w-[15rem] opacity-100 translate-x-0"
          }`}
        >
          <BrandLockup className="w-max text-left text-[1.35rem] tracking-[0.15em] xl:text-[1.65rem] xl:tracking-[0.2em]" />
        </span>
      </span>
    </Link>
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
    let ticking = false;

    const update = () => {
      setScrolled(window.scrollY > 24);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

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
    setSearchOpen(false);
    setCartOpen(false);
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
          <div className="mx-auto flex h-[4.5rem] max-w-[1600px] items-center justify-between gap-3 px-5 md:h-20 md:gap-4 md:px-6 lg:gap-6 lg:px-8 xl:px-10">
            {/* LEFT: brand (all screens) */}
            <div className="flex shrink-0 items-center lg:min-w-0 lg:flex-1">
              <AnimatedHeaderBrand condensed={scrolled} />
            </div>

            {/* RIGHT: all nav (desktop) · control clusters */}
            <div className="flex shrink-0 items-center justify-end gap-2 lg:gap-4 xl:gap-6">
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

              {/* Mobile/tablet cluster: Search → Currency → Account → Cart → Hamburger */}
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 lg:hidden">
                <button
                  aria-label="Search"
                  className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center touch-manipulation text-foreground/80 transition hover:text-accent active:opacity-80"
                  onClick={() => {
                    publish('custom_search_opened', {});
                    setSearchOpen(true);
                  }}
                >
                  <Search className="h-[18px] w-[18px]" strokeWidth={1} />
                </button>
                <CurrencyDropdown compact />
                <ShopifyAccount
                  publicStoreDomain={publicStoreDomain}
                  publicAccessToken={publicAccessToken}
                  customerAccessToken={customerAccessToken}
                  compact
                />
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  aria-label={count > 0 ? `Bag, ${count} item${count === 1 ? "" : "s"}` : "Bag"}
                  className="relative flex h-10 w-10 min-h-10 min-w-10 items-center justify-center touch-manipulation text-foreground/80 transition hover:text-accent active:opacity-80"
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
                  className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center touch-manipulation text-foreground/80 transition hover:text-accent active:opacity-80"
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
                  className="touch-target flex h-11 w-11 items-center justify-center text-foreground/80 transition hover:text-accent active:opacity-80"
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
                />
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  aria-label={count > 0 ? `Bag, ${count} item${count === 1 ? "" : "s"}` : "Bag"}
                  className="relative touch-target flex h-11 w-11 items-center justify-center text-foreground/80 transition hover:text-accent active:opacity-80"
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
              <div
                className="flex h-[4.5rem] shrink-0 items-center justify-between gap-4 border-b px-5"
                style={{ borderColor: "var(--border)" }}
              >
                <Link
                  to="/"
                  aria-label="Home"
                  onClick={requestMenuClose}
                  className="group flex min-w-0 items-center gap-2.5"
                >
                  <BrandMark className="h-8 w-8 shrink-0" />
                  <BrandLockup className="text-left text-[1rem] tracking-[0.1em]" />
                </Link>
                <button
                  onClick={requestMenuClose}
                  aria-label="Close menu"
                  className="flex h-10 w-10 shrink-0 items-center justify-center touch-manipulation text-foreground/80 transition hover:text-accent active:opacity-80"
                >
                  <X className="h-[18px] w-[18px]" strokeWidth={1} />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-12 pt-8">
                {navItems.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={requestMenuClose}
                    className="font-display flex min-h-11 items-center py-2 text-3xl tracking-wide transition hover:text-accent active:opacity-80"
                    style={pathname === n.to ? { color: "var(--accent)" } : undefined}
                  >
                    {n.label}
                  </Link>
                ))}
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

function CurrencyDropdown({compact = false}: {compact?: boolean}) {
  const {currencies, selectedCurrency} = useLocalization();
  const {pathname, search} = useLocation();
  const navigation = useNavigation();
  const isLgUp = useIsLgUp();
  const [open, setOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetClosingRef = useRef(false);
  const displayCode = pendingCode ?? selectedCurrency.code;
  const isUpdating = pendingCode != null || navigation.state !== "idle";

  const requestClose = useCallback(() => {
    if (sheetClosingRef.current) return;
    sheetClosingRef.current = true;
    setSheetVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      sheetClosingRef.current = false;
    }, CURRENCY_SHEET_CLOSE_MS);
  }, []);

  const handleOpen = useCallback(() => {
    sheetClosingRef.current = false;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (navigation.state === "idle") {
      setPendingCode(null);
    }
  }, [navigation.state, selectedCurrency.code]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Mobile sheet: scroll lock, entrance animation, Escape.
  useEffect(() => {
    if (!open || isLgUp) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        requestClose();
        triggerRef.current?.focus();
      }
    };

    lockScroll();
    window.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => setSheetVisible(true));

    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
      cancelAnimationFrame(raf);
      setSheetVisible(false);
    };
  }, [open, isLgUp, requestClose]);

  // Desktop popover: click outside + Escape.
  useEffect(() => {
    if (!open || !isLgUp) return;

    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
  }, [open, isLgUp]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [open]);

  useFocusTrap(open && !isLgUp, sheetRef, inputRef);

  const q = query.trim().toLowerCase();
  const results = q
    ? currencies.filter((c) =>
        [c.code, c.symbol, c.name].some((field) => field.toLowerCase().includes(q)),
      )
    : currencies;

  const handleSelect = (code: string) => {
    setPendingCode(code);
    if (isLgUp) {
      setOpen(false);
    } else {
      requestClose();
    }
  };

  const pickerPanel = (
    <CurrencyPickerPanel
      query={query}
      setQuery={setQuery}
      inputRef={inputRef}
      results={results}
      displayCode={displayCode}
      pathname={pathname}
      search={search}
      onSelect={handleSelect}
      listClassName={isLgUp ? "max-h-[60vh]" : "max-h-none flex-1 min-h-0"}
    />
  );

  const mobileSheet =
    open && !isLgUp && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close currency picker"
              className="fixed inset-0 z-[80] bg-black/50 transition-opacity duration-300 ease-out motion-reduce:transition-none"
              style={{opacity: sheetVisible ? 1 : 0}}
              onClick={requestClose}
            />
            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Select currency"
              className="fixed inset-x-0 bottom-0 z-[81] flex max-h-[min(85dvh,640px)] flex-col rounded-t-2xl border-t shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                paddingBottom: "env(safe-area-inset-bottom)",
                transform: sheetVisible ? "translateY(0)" : "translateY(100%)",
              }}
            >
              <div
                className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
                style={{borderColor: "var(--border)"}}
              >
                <div className="min-w-0">
                  <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
                    Currency
                  </p>
                  <p className="font-display text-lg tracking-wide">{displayCode}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={requestClose}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:text-accent"
                >
                  <X className="h-5 w-5" strokeWidth={1} />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden py-2">
                {pickerPanel}
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={wrapRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Select currency, current ${displayCode}`}
          onClick={() => (open ? (isLgUp ? setOpen(false) : requestClose()) : handleOpen())}
          className={`flex items-center justify-center gap-1 px-1 text-[0.65rem] uppercase tracking-[0.15em] text-foreground/90 transition hover:text-accent focus:outline-none min-[420px]:gap-1.5 min-[420px]:px-1.5 min-[420px]:text-xs min-[420px]:tracking-[0.25em] lg:justify-start ${
            compact
              ? "h-10 w-10 min-w-10 min-[420px]:w-auto"
              : "h-11 w-11 min-w-11 min-[420px]:w-auto"
          }`}
          style={{opacity: isUpdating ? 0.65 : 1}}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={1} aria-hidden />
          <span className="hidden min-[420px]:inline">{displayCode}</span>
          <ChevronDown
            className="h-3 w-3 shrink-0 transition-transform min-[420px]:h-3.5 min-[420px]:w-3.5"
            strokeWidth={1}
            style={{transform: open ? "rotate(180deg)" : undefined}}
          />
        </button>

        {isLgUp && (
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
            {pickerPanel}
          </div>
        )}
      </div>
      {mobileSheet}
    </>
  );
}

function CurrencyPickerPanel({
  query,
  setQuery,
  inputRef,
  results,
  displayCode,
  pathname,
  search,
  onSelect,
  listClassName,
}: {
  query: string;
  setQuery: (value: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  results: ShopCurrencyOption[];
  displayCode: string;
  pathname: string;
  search: string;
  onSelect: (code: string) => void;
  listClassName?: string;
}) {
  return (
    <>
      <div
        className="mx-2 mb-2 flex items-center gap-2 rounded-md border px-3 pb-2 pt-2"
        style={{borderColor: "var(--border)", background: "var(--background)"}}
      >
        <Search
          className="h-3.5 w-3.5 shrink-0"
          strokeWidth={1}
          style={{color: "var(--muted-foreground)"}}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          role="combobox"
          aria-expanded
          aria-controls="currency-listbox"
          aria-label="Search currency"
          placeholder="Search currency…"
          className="w-full bg-transparent text-base tracking-wide text-foreground placeholder:text-[var(--muted-foreground)] focus:outline-none lg:text-xs"
        />
      </div>
      {results.length === 0 ? (
        <p
          className="px-3 py-6 text-center text-[0.7rem] tracking-wide"
          style={{color: "var(--muted-foreground)"}}
        >
          No currencies found
        </p>
      ) : (
        <ul
          id="currency-listbox"
          role="listbox"
          aria-label="Currency"
          className={`overflow-y-auto overscroll-contain px-2 pb-1 ${listClassName ?? "max-h-[60vh]"}`}
        >
          {results.map((c) => (
            <CurrencyOption
              key={c.code}
              option={c}
              active={c.code === displayCode}
              pathname={pathname}
              search={search}
              onSelect={() => onSelect(c.code)}
            />
          ))}
        </ul>
      )}
    </>
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
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-all duration-200 hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none disabled:opacity-50 lg:py-2.5"
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
