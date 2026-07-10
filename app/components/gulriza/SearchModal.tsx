import {Link, useNavigate} from "react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Search, X } from "lucide-react";
import type { Collection, Money, Product } from "~/models/types";
import { useCatalog } from "~/contexts/catalog-context";
import { useFormatPrice } from "~/lib/currency-store";
import { useFocusTrap } from "~/hooks/use-focus-trap";
import { lockScroll, unlockScroll } from "~/lib/scroll-lock";

const MAX_RESULTS = 10;
const CLOSE_MS = 220;

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products, collections, featuredProducts = [] } = useCatalog();
  // Idle Featured list = homepage-featured collection (manual Admin order), not newest-first catalog.
  const suggested = useMemo(
    () => (featuredProducts.length ? featuredProducts : products).slice(0, 5),
    [featuredProducts, products],
  );
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(-1);
  const formatPrice = useFormatPrice();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const navigate = useNavigate();
  useFocusTrap(open, dialogRef, inputRef);

  // Animated close: play the exit transition, then notify the parent.
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  const trimmed = query.trim().toLowerCase();
  const [predictiveHandles, setPredictiveHandles] = useState<string[]>([]);

  useEffect(() => {
    if (!trimmed) {
      setPredictiveHandles([]);
      return;
    }
    const ac = new AbortController();
    fetch(
      `/search?q=${encodeURIComponent(trimmed)}&predictive=true&limit=${MAX_RESULTS}`,
      {signal: ac.signal},
    )
      .then((r) => r.json())
      .then((raw: unknown) => {
        const data = raw as {
          result?: {items?: {products?: Array<{handle?: string}>}};
        };
        const handles =
          data.result?.items?.products
            ?.map((p) => p.handle)
            .filter((h): h is string => Boolean(h)) ?? [];
        setPredictiveHandles(handles);
      })
      .catch(() => setPredictiveHandles([]));
    return () => ac.abort();
  }, [trimmed]);

  const results = useMemo(() => {
    if (!trimmed) return [];
    if (predictiveHandles.length) {
      const ordered = predictiveHandles
        .map((handle) => products.find((p) => p.handle === handle))
        .filter((p): p is Product => Boolean(p));
      if (ordered.length) return ordered.slice(0, MAX_RESULTS);
    }
    return products
      .filter((p) =>
        [p.name, p.collectionName, p.shortDescription].join(" ").toLowerCase().includes(trimmed),
      )
      .slice(0, MAX_RESULTS);
  }, [trimmed, products, predictiveHandles]);

  // Matching collections — surfaced alongside product results.
  const collectionResults = useMemo(() => {
    if (!trimmed) return [];
    return collections.filter((c) =>
      [c.name, c.tagline, c.story].join(" ").toLowerCase().includes(trimmed),
    );
  }, [trimmed]);

  // The list the keyboard navigates: live product results, or featured suggestions
  // when idle. Collections are not part of keyboard nav (kept scoped to products).
  const navList = trimmed ? results : suggested;

  useEffect(() => {
    if (!open) return;
    closingRef.current = false;
    setQuery("");
    setActive(-1);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    lockScroll();
    // Focus the field and trigger the entrance transition on the next frame.
    const raf = requestAnimationFrame(() => {
      setVisible(true);
      inputRef.current?.focus();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
      cancelAnimationFrame(raf);
    };
  }, [open, requestClose]);

  // Reset the keyboard cursor whenever the query changes.
  useEffect(() => setActive(-1), [trimmed]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!navList.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % navList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? navList.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      navigate(`/products/${navList[active].handle}`);
      requestClose();
    }
  };

  if (!open || typeof document === "undefined") return null;

  const hasQuery = trimmed.length > 0;
  const noMatches = hasQuery && results.length === 0 && collectionResults.length === 0;

  // Rendered from SiteHeader, which applies `backdrop-blur` (a backdrop-filter).
  // That makes the header the containing block for `position: fixed` descendants,
  // trapping this `fixed inset-0` overlay inside the short header box.
  // Portalling to <body> escapes that containing block + stacking context so
  // the overlay reliably covers the viewport.
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Search the collection"
      onClick={requestClose}
      className="fixed inset-0 z-[100] flex justify-center overflow-y-auto backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none"
      style={{ background: "var(--backdrop)", opacity: visible ? 1 : 0 }}
    >
      <button
        onClick={requestClose}
        aria-label="Close search"
        className="touch-target fixed right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border text-muted-foreground transition hover:border-accent hover:text-accent active:opacity-80"
        style={{ borderColor: "var(--border)", background: "var(--backdrop-soft)" }}
      >
        <X className="h-5 w-5" strokeWidth={1} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl px-5 pb-16 pt-20 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:translate-y-0 sm:px-6 md:pt-28"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "translateY(-12px) scale(0.985)",
        }}
      >
        {/* Hero search field */}
        <label
          className="group flex items-center gap-4 border-b pb-5 transition-colors focus-within:border-[var(--accent)]"
          style={{ borderColor: "var(--border)" }}
        >
          <Search
            className="h-6 w-6 shrink-0 text-muted-foreground transition-colors group-focus-within:text-accent"
            strokeWidth={1}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search the atelier — by name or collection"
            aria-label="Search the atelier by name or collection"
            autoComplete="off"
            inputMode="search"
            enterKeyHint="search"
            spellCheck={false}
            className="font-display w-full bg-transparent text-2xl outline-none placeholder:text-muted-foreground md:text-3xl"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:text-accent active:opacity-80"
            >
              <X className="h-4 w-4" strokeWidth={1.25} />
            </button>
          )}
        </label>

        <div className="mt-8">
          {/* (a) Idle — suggested collections + featured pieces */}
          {!hasQuery && (
            <div className="flex flex-col gap-10">
              <div>
                <p className="tracked text-muted-foreground">Collections</p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {collections.map((c) => (
                    <Link
                      key={c.handle}
                      to={`/collections/${c.handle}`}
                      onClick={requestClose}
                      className="inline-flex min-h-11 items-center border px-4 py-2 text-xs tracking-[0.2em] uppercase text-muted-foreground transition hover:border-accent hover:text-accent hover:bg-accent/5 active:opacity-80"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="tracked text-muted-foreground">Featured</p>
                <div className="relative mt-3">
                  <ul
                    className="no-scrollbar flex max-h-[40dvh] flex-col overflow-y-auto pb-8"
                    style={{
                      maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
                      WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
                    }}
                  >
                    {suggested.map((p, i) => (
                      <ResultRow
                        key={p.handle}
                        product={p}
                        active={active === i}
                        onActivate={() => setActive(i)}
                        onClose={requestClose}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </ul>
                  <div className="pointer-events-none absolute bottom-0 left-0 flex w-full justify-center pb-1">
                    <span className="animate-pulse text-[0.6rem] uppercase tracking-widest text-muted-foreground/60">
                      Scroll for more
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* (b) Matches — collections, then pieces */}
          {(collectionResults.length > 0 || results.length > 0) && (
            <div className="flex flex-col gap-10">
              {collectionResults.length > 0 && (
                <div>
                  <p className="tracked text-muted-foreground">Collections</p>
                  <ul className="mt-3 flex flex-col">
                    {collectionResults.map((c) => (
                      <CollectionRow key={c.handle} collection={c} onClose={requestClose} />
                    ))}
                  </ul>
                </div>
              )}

              {results.length > 0 && (
                <div>
                  <p className="tracked text-muted-foreground">
                    {results.length} {results.length === 1 ? "Piece" : "Pieces"}
                  </p>
                  <ul className="no-scrollbar mt-3 flex max-h-[40dvh] flex-col overflow-y-auto">
                    {results.map((p, i) => (
                      <ResultRow
                        key={p.handle}
                        product={p}
                        active={active === i}
                        onActivate={() => setActive(i)}
                        onClose={requestClose}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* (c) No matches */}
          {noMatches && (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="font-display text-2xl">No pieces match “{query.trim()}”.</p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Try a different name or browse the full atelier by collection.
              </p>
              <Link
                to="/collections"
                onClick={requestClose}
                className="group tracked mt-8 inline-flex items-center gap-3 border border-accent px-8 py-4 text-accent transition hover:bg-accent hover:text-background"
              >
                Browse collections
                <ArrowRight
                  className="h-4 w-4 transition group-hover:translate-x-1"
                  strokeWidth={1}
                />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CollectionRow({
  collection,
  onClose,
}: {
  collection: Collection;
  onClose: () => void;
}) {
  return (
    <li>
      <Link
        to={`/collections/${collection.handle}`}
        onClick={onClose}
        className="group flex items-center gap-5 border-b px-2 py-4 transition-all hover:px-3"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="relative aspect-[4/5] h-20 shrink-0 overflow-hidden"
          style={{ background: "var(--surface)" }}
        >
          <img
            src={collection.hero.src}
            alt={collection.hero.alt}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-display text-lg transition-colors group-hover:text-accent">
            {collection.name}
          </span>
          <span className="mt-1 truncate text-[0.65rem] tracking-[0.3em] uppercase text-muted-foreground">
            {collection.tagline}
          </span>
        </span>
        <ArrowRight
          className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
          strokeWidth={1}
        />
      </Link>
    </li>
  );
}

function ResultRow({
  product,
  active,
  onActivate,
  onClose,
  formatPrice,
}: {
  product: Product;
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
  formatPrice: (money: Money) => string;
}) {
  return (
    <li>
      <Link
        to={`/products/${product.handle}`}
        onClick={onClose}
        onMouseEnter={onActivate}
        aria-current={active || undefined}
        className="group flex items-center gap-5 border-b px-2 py-4 transition-all hover:px-3"
        style={{
          borderColor: "var(--border)",
          background: active ? "var(--surface)" : "transparent",
        }}
      >
        <span
          className="relative aspect-[4/5] h-20 shrink-0 overflow-hidden"
          style={{ background: "var(--surface)" }}
        >
          <img
            src={product.images[0].src}
            alt={product.images[0].alt}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </span>
        <span className="flex min-w-0 flex-col">
          <span
            className="font-display text-lg transition-colors group-hover:text-accent"
            style={{ color: active ? "var(--accent)" : undefined }}
          >
            {product.name}
          </span>
          <span className="mt-1 text-[0.65rem] tracking-[0.3em] uppercase text-muted-foreground">
            {product.collectionName}
          </span>
        </span>
        <span className="ml-auto shrink-0 pl-3 text-sm text-muted-foreground">
          {formatPrice(product.price)}
        </span>
      </Link>
    </li>
  );
}
