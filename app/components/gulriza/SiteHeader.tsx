import {Link, useLocation, useNavigate, useNavigation, useFetchers, type FetcherWithComponents} from "react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Search, ShoppingBag, Menu, X, ChevronDown, Check, Globe } from "lucide-react";
import { CartForm, useAnalytics } from "@shopify/hydrogen";
import { useLocalization } from "~/contexts/localization-context";
import type { ShopCurrencyOption } from "~/lib/localization";
import { marketHref } from "~/lib/market-url";
import { Marquee } from "~/components/gulriza/Marquee";
import { lockScroll, unlockScroll } from "~/lib/scroll-lock";
import { useCartDrawer } from "~/contexts/cart-drawer-context";
import type { CartApiQueryFragment } from "storefrontapi.generated";
import { syncLiveCartCache } from "~/lib/use-live-cart";
import { ShopifyAccount } from "~/components/gulriza/ShopifyAccount";
import { useFocusTrap } from "~/hooks/use-focus-trap";
import type {ShopSettings, NavItem} from "~/lib/shop-settings";
import {BrandLockup, BrandMark} from "~/components/gulriza/BrandLockup";

// Code-split the 400-line SearchModal — only needed when the user opens
// search. The modal is portaled and mounted hidden, so a null fallback is
// invisible.
const SearchModal = lazy(() =>
  import("~/components/gulriza/SearchModal").then((m) => ({default: m.SearchModal})),
);

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

// Brand name at scroll top (mobile + desktop). On mobile only, scroll crossfades
// the wordmark into the loom emblem; desktop keeps the name at all scroll positions.
function AnimatedHeaderBrand({
  condensed,
  homeHref = "/",
}: {
  condensed: boolean;
  homeHref?: string;
}) {
  const brandMotion =
    "transition-[opacity,transform,max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

  return (
    <>
      {/* Mobile: brand name at top → logo on scroll */}
      <Link
        to={homeHref}
        aria-label={condensed ? "The Kashmir Weaver — home" : undefined}
        className={`relative flex shrink-0 items-center lg:hidden ${
          condensed ? "h-8 w-8" : "min-h-[2.35rem] min-w-[6.75rem]"
        }`}
      >
        <span
          aria-hidden={condensed}
          className={`absolute inset-0 flex items-center ${brandMotion} ${
            condensed
              ? "pointer-events-none scale-95 opacity-0 -translate-y-1"
              : "scale-100 opacity-100 translate-y-0"
          }`}
        >
          <BrandLockup className="text-left text-[0.82rem] tracking-[0.08em] min-[420px]:text-[0.9rem] min-[420px]:tracking-[0.1em]" />
        </span>
        <span
          aria-hidden={!condensed}
          className={`absolute inset-0 flex items-center ${brandMotion} ${
            condensed
              ? "scale-100 opacity-100 translate-y-0"
              : "pointer-events-none scale-90 opacity-0 translate-y-1"
          }`}
        >
          <BrandMark className="h-8 w-8" />
        </span>
      </Link>

      {/* Desktop: brand name always (scroll does not swap to logo) */}
      <Link
        to={homeHref}
        className="hidden shrink-0 items-center lg:flex"
      >
        <BrandLockup className="w-max shrink-0 text-left text-[1.25rem] tracking-[0.12em] xl:text-[1.5rem] xl:tracking-[0.15em]" />
      </Link>
    </>
  );
}

export function SiteHeader({
  transparent = false,
  shopSettings,
  publicStoreDomain,
  publicAccessToken,
  customerAccessToken = null,
}: {
  transparent?: boolean;
  shopSettings?: ShopSettings;
  publicStoreDomain: string;
  publicAccessToken: string;
  customerAccessToken?: string | null;
}) {
  const {publish} = useAnalytics();
  const {cartQuantity, open: openCart} = useCartDrawer();
  const {selectedCurrency} = useLocalization();
  const {pathname, search} = useLocation();
  const marketTo = useCallback(
    (path: string) => marketHref(path, search, selectedCurrency.countryCode),
    [search, selectedCurrency.countryCode],
  );
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
          <div className="mx-auto flex h-[4.75rem] max-w-[1600px] items-center justify-between gap-3 px-4 min-[420px]:gap-4 min-[420px]:px-5 md:h-20 md:px-6 lg:gap-6 lg:px-8 xl:px-10">
            {/* LEFT: brand */}
            <div className="flex shrink-0 items-center lg:mr-2">
              <AnimatedHeaderBrand condensed={scrolled} homeHref={marketTo("/")} />
            </div>

            {/* RIGHT: all nav (desktop) · control clusters */}
            <div className="flex shrink-0 items-center justify-end gap-2 lg:gap-4 xl:gap-6">
              <nav className="hidden items-center gap-4 lg:flex xl:gap-7">
                {navItems.map((n) => {
                  const isShop = n.label === "Shop";
                  return (
                    <Link
                      key={n.to}
                      to={marketTo(n.to)}
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
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:hidden">
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
                  onClick={openCart}
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
                  onClick={openCart}
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
                className="flex h-[4.75rem] shrink-0 items-center justify-between gap-4 border-b px-4 min-[420px]:px-5"
                style={{ borderColor: "var(--border)" }}
              >
                <Link
                  to={marketTo("/")}
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
                    to={marketTo(n.to)}
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

          <Suspense fallback={null}>
            <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
          </Suspense>
        </header>
      </div>
    </>
  );
}

function CurrencyDropdown({compact = false}: {compact?: boolean}) {
  const {currencies, selectedCurrency} = useLocalization();
  const {pathname, search} = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const fetchers = useFetchers();
  const isLgUp = useIsLgUp();
  const [open, setOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [pendingMarketCountry, setPendingMarketCountry] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetClosingRef = useRef(false);

  const pendingCurrency = useMemo(() => {
    if (!pendingMarketCountry) return null;
    return (
      currencies.find((c) => c.countryCode === pendingMarketCountry) ?? null
    );
  }, [pendingMarketCountry, currencies]);

  const pendingFetcher = useMemo(() => {
    if (!pendingMarketCountry) return null;
    return (
      fetchers.find((f) => f.key === `market-${pendingMarketCountry}`) ?? null
    );
  }, [fetchers, pendingMarketCountry]);

  const isSwitching = pendingFetcher != null && pendingFetcher.state !== "idle";
  const displayCode =
    isSwitching && pendingCurrency
      ? pendingCurrency.code
      : selectedCurrency.code;
  const activeCountryCode = selectedCurrency.countryCode;
  const isUpdating =
    isSwitching ||
    navigation.state !== "idle" ||
    fetchers.some(
      (f) => f.key?.startsWith("market-") && f.state !== "idle",
    );

  const handledMarketSwitchRef = useRef<string | null>(null);

  useEffect(() => {
    const urlCountry = new URLSearchParams(search).get("country")?.toUpperCase() ?? null;

    for (const fetcher of fetchers) {
      if (!fetcher.key?.startsWith("market-")) continue;
      if (fetcher.state !== "idle" || !fetcher.data) continue;

      const targetCountry = fetcher.key.slice("market-".length);
      const data = fetcher.data as MarketCartActionData;
      const cart = data.cart;
      const handledKey = `${targetCountry}:${cart?.buyerIdentity?.countryCode ?? "none"}`;
      if (handledMarketSwitchRef.current === handledKey) continue;

      if (data.errors?.length) {
        handledMarketSwitchRef.current = handledKey;
        setPendingMarketCountry((current) =>
          current === targetCountry ? null : current,
        );
        continue;
      }

      const identityMatched = cart?.buyerIdentity?.countryCode === targetCountry;
      const hasPrices = Boolean(cart?.cost?.subtotalAmount?.currencyCode);
      if (!identityMatched && !hasPrices) continue;

      handledMarketSwitchRef.current = handledKey;
      if (cart) syncLiveCartCache(cart as CartApiQueryFragment);

      if (urlCountry !== targetCountry) {
        navigate(marketHref(pathname, search, targetCountry), {
          replace: true,
          preventScrollReset: true,
        });
      }

      setPendingMarketCountry((current) =>
        current === targetCountry ? null : current,
      );
      setOpen(false);
      setSheetVisible(false);
    }
  }, [fetchers, navigate, pathname, search]);

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

  const handleSelect = (_code: string, countryCode: string) => {
    if (isUpdating) return;
    setPendingMarketCountry(countryCode);
    // Keep picker mounted until the CartForm POST completes — closing unmounts the form.
  };

  const pickerPanel = (
    <CurrencyPickerPanel
      query={query}
      setQuery={setQuery}
      inputRef={inputRef}
      results={results}
      displayCode={displayCode}
      activeCountryCode={activeCountryCode}
      pathname={pathname}
      search={search}
      onSelect={handleSelect}
      marketSwitchBusy={isUpdating}
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
          className={`flex items-center justify-center gap-1 px-1 text-[0.65rem] uppercase tracking-[0.15em] text-foreground/90 transition hover:text-accent focus:outline-none min-[480px]:gap-1.5 min-[480px]:px-1.5 min-[480px]:text-xs min-[480px]:tracking-[0.25em] lg:justify-start ${
            compact
              ? "h-10 w-10 min-w-10 min-[480px]:w-auto"
              : "h-11 w-11 min-w-11 min-[480px]:w-auto"
          }`}
          style={{opacity: isUpdating ? 0.65 : 1}}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={1} aria-hidden />
          <span className="hidden min-[480px]:inline">{displayCode}</span>
          <ChevronDown
            className="hidden h-3 w-3 shrink-0 transition-transform min-[480px]:block min-[480px]:h-3.5 min-[480px]:w-3.5"
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
  activeCountryCode,
  pathname,
  search,
  onSelect,
  marketSwitchBusy = false,
  listClassName,
}: {
  query: string;
  setQuery: (value: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  results: ShopCurrencyOption[];
  displayCode: string;
  activeCountryCode: string;
  pathname: string;
  search: string;
  onSelect: (code: string, countryCode: string) => void;
  marketSwitchBusy?: boolean;
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
              active={c.countryCode === activeCountryCode}
              disabled={marketSwitchBusy}
              onSelect={() => onSelect(c.code, c.countryCode)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

type MarketCartActionData = {
  cart?: CartApiQueryFragment | null;
  errors?: Array<{message?: string}>;
};

function CurrencyOption({
  option,
  active,
  disabled = false,
  onSelect,
}: {
  option: ShopCurrencyOption;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
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
          <>
            <input type="hidden" name="marketCurrencyCode" value={option.code} />
            <CurrencyOptionButton
              option={option}
              active={active}
              disabled={disabled}
              onSelect={onSelect}
              fetcher={fetcher}
            />
          </>
        )}
      </CartForm>
    </li>
  );
}

function CurrencyOptionButton({
  option,
  active,
  disabled = false,
  onSelect,
  fetcher,
}: {
  option: ShopCurrencyOption;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
  fetcher: FetcherWithComponents<MarketCartActionData>;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || active || fetcher.state !== "idle"}
      onClick={() => {
        if (active) return;
        onSelect();
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
  );
}
