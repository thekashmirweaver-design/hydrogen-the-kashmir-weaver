import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import type { Product } from "~/models/types";
import { useCatalog } from "~/contexts/catalog-context";
import { ProductTile } from "~/components/gulriza/ProductTile";
import { Hairline } from "~/components/gulriza/Eyebrow";
import { useLocalization } from "~/contexts/localization-context";
import type { ShopCurrencyOption } from "~/lib/localization";
import { useFocusTrap } from "~/hooks/use-focus-trap";
import { lockScroll, unlockScroll } from "~/lib/scroll-lock";
import { ShadeSwatch } from "~/components/gulriza/ShadeSwatch";
import {
  collectColorsFromProducts,
  productMatchesColors,
  type CatalogColor,
} from "~/lib/catalog-colors";
import type { CatalogPageInfo, CatalogFilters, ProductListScope, SortKey } from "~/lib/catalog-pagination";
import { DEFAULT_CATALOG_SORT, productMatchesCollections } from "~/lib/catalog-pagination";
import { orderProductsBySolidFamily } from "~/lib/solid-family-order";
import { usePagePagination } from "~/hooks/use-page-pagination";
import { PagePagination } from "~/components/gulriza/PagePagination";

export type FilterKey = "collection" | "price" | "color";

type Filters = {
  collections: Set<string>;
  priceMin: number;
  priceMax: number;
  colors: Set<string>;
};

const ALL_SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Low to High" },
  { id: "price-desc", label: "High to Low" },
];

/** Default catalog sorts (shop + collections). */
const DEFAULT_SORT_KEYS: SortKey[] = [
  "newest",
  "price-asc",
  "price-desc",
];

export function ProductCatalog({
  products: initialProducts,
  pageInfo,
  listSource,
  filters: enabled = ["collection", "price"],
  sortKeys = DEFAULT_SORT_KEYS,
  resultsLabel = "pieces",
  emptyMessage,
  id,
  familyDiverseOrder = false,
}: {
  products: Product[];
  pageInfo?: CatalogPageInfo;
  listSource?: ProductListScope;
  /** Which filter facets to show. Pass [] to hide sidebar entirely (sort-only). */
  filters?: FilterKey[];
  /** Sort methods exposed in the dropdown. */
  sortKeys?: SortKey[];
  resultsLabel?: string;
  /** Override empty grid copy (e.g. collection pages with no filters). */
  emptyMessage?: string;
  /** Anchor id for in-page navigation (e.g. collection page section nav). */
  id?: string;
  /**
   * After primary sort/filters, re-order so adjacent tiles prefer different
   * solid colour families (Solids collection only).
   */
  familyDiverseOrder?: boolean;
}) {
  const { collections } = useCatalog();
  const paginationEnabled = Boolean(listSource && pageInfo);
  const sortOptions = useMemo(
    () =>
      ALL_SORT_OPTIONS.filter((option) => sortKeys.includes(option.id)),
    [sortKeys],
  );
  const defaultSort =
    sortKeys.includes(DEFAULT_CATALOG_SORT)
      ? DEFAULT_CATALOG_SORT
      : (sortKeys[0] ?? DEFAULT_CATALOG_SORT);
  const [sort, setSort] = useState<SortKey>(defaultSort);
  const [priceMinFilter, setPriceMinFilter] = useState<number | undefined>();
  const [priceMaxFilter, setPriceMaxFilter] = useState<number | undefined>();
  const [collectionFilter, setCollectionFilter] = useState<string[]>([]);
  const priceFilterTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const catalogFilters: CatalogFilters = useMemo(() => ({
    priceMin: priceMinFilter,
    priceMax: priceMaxFilter,
    collections: collectionFilter.length ? collectionFilter : undefined,
  }), [priceMinFilter, priceMaxFilter, collectionFilter]);

  const pagination = usePagePagination({
    initialProducts,
    initialPageInfo: pageInfo ?? { hasNextPage: false, endCursor: null },
    listSource: listSource ?? { scope: "shop" },
    sortKey: sort,
    filters: catalogFilters,
    enabled: paginationEnabled,
  });
  const gridRef = useRef<HTMLDivElement>(null);
  const prevPageRef = useRef(1);

  useEffect(() => {
    if (!paginationEnabled) return;
    if (prevPageRef.current !== pagination.currentPage) {
      prevPageRef.current = pagination.currentPage;
      gridRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }, [pagination.currentPage, paginationEnabled]);

  const products = paginationEnabled ? pagination.products : initialProducts;
  const priceBounds = useMemo(() => {
    const all = products.map((p) => p.price.amount);
    const min = all.length ? Math.min(...all) : 0;
    const max = all.length ? Math.max(...all) : 0;
    return { min, max };
  }, [products]);

  const availableColors = useMemo(
    () =>
      enabled.includes("color")
        ? collectColorsFromProducts([...initialProducts, ...products])
        : [],
    [enabled, initialProducts, products],
  );

  const initial: Filters = {
    collections: new Set(),
    priceMin: priceBounds.min,
    priceMax: priceBounds.max,
    colors: new Set(),
  };

  const showColorFilter = enabled.includes("color") && availableColors.length > 0;

  const [filters, setFilters] = useState<Filters>(initial);
  const [drawer, setDrawer] = useState(false);
  const [colorQuery, setColorQuery] = useState("");
  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawer, drawerRef);

  const showSidebar = enabled.length > 0 && (showColorFilter || enabled.some((f) => f !== "color"));
  const { selectedCurrency } = useLocalization();

  // Mobile filter drawer: lock body scroll and close on Escape while open.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [drawer]);

  const resolvedFilters = useMemo((): Filters => {
    const stalePriceBounds =
      enabled.includes("price") &&
      priceBounds.max > 0 &&
      filters.priceMin === 0 &&
      filters.priceMax === 0;
    if (!stalePriceBounds) return filters;
    return {
      ...filters,
      priceMin: priceBounds.min,
      priceMax: priceBounds.max,
    };
  }, [enabled, filters, priceBounds]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.stock !== 'out');
    const selected = [...resolvedFilters.collections];
    if (enabled.includes("collection") && resolvedFilters.collections.size) {
      // Server already filters by collection when pagination is on; keep a
      // client pass for non-paginated catalogs / stale pages.
      list = list.filter((p) => productMatchesCollections(p, selected));
    }
    if (enabled.includes("price"))
      list = list.filter(
        (p) =>
          p.price.amount >= resolvedFilters.priceMin &&
          p.price.amount <= resolvedFilters.priceMax,
      );
    if (showColorFilter && resolvedFilters.colors.size) {
      list = list.filter((p) =>
        productMatchesColors(p, [...resolvedFilters.colors]),
      );
    }

    if (!paginationEnabled) {
      if (sort === "price-asc") list.sort((a, b) => a.price.amount - b.price.amount);
      else if (sort === "price-desc") list.sort((a, b) => b.price.amount - a.price.amount);
      else if (sort === "newest")
        list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
    // Paginated Solids already arrive family-diversified from the API — only
    // re-run after client-only filters (or non-paginated catalogs) so "load
    // more" does not reshuffle tiles already on screen.
    const colorFilterActive =
      showColorFilter && resolvedFilters.colors.size > 0;
    if (familyDiverseOrder && (!paginationEnabled || colorFilterActive)) {
      return orderProductsBySolidFamily(list);
    }
    return list;
  }, [enabled, resolvedFilters, sort, products, paginationEnabled, showColorFilter, familyDiverseOrder]);

  const toggle = (key: "collections" | "colors", value: string) => {
    setFilters((f) => {
      const next = { ...f, [key]: new Set(f[key]) } as Filters;
      const s = next[key] as Set<string>;
      if (s.has(value)) s.delete(value);
      else s.add(value);
      if (key === "collections" && paginationEnabled) {
        setCollectionFilter([...s]);
      }
      return next;
    });
  };

  const priceActive =
    enabled.includes("price") &&
    (resolvedFilters.priceMin !== priceBounds.min ||
      resolvedFilters.priceMax !== priceBounds.max);

  const activeCount =
    (enabled.includes("collection") ? resolvedFilters.collections.size : 0) +
    (priceActive ? 1 : 0) +
    (showColorFilter ? resolvedFilters.colors.size : 0);

  const reset = () => {
    setFilters(initial);
    setColorQuery("");
    if (paginationEnabled) {
      setCollectionFilter([]);
      setPriceMinFilter(undefined);
      setPriceMaxFilter(undefined);
    }
  };

  const resetPrice = () => {
    setFilters((f) => ({
      ...f,
      priceMin: priceBounds.min,
      priceMax: priceBounds.max,
    }));
    if (paginationEnabled) {
      setPriceMinFilter(undefined);
      setPriceMaxFilter(undefined);
    }
  };

  const orderedColors = useMemo(() => {
    const q = colorQuery.trim().toLowerCase();
    const list = q
      ? availableColors.filter((c) => c.name.toLowerCase().includes(q))
      : availableColors;
    return [...list].sort((a, b) => {
      const aOn = resolvedFilters.colors.has(a.name) ? 0 : 1;
      const bOn = resolvedFilters.colors.has(b.name) ? 0 : 1;
      if (aOn !== bOn) return aOn - bOn;
      return a.name.localeCompare(b.name);
    });
  }, [availableColors, colorQuery, resolvedFilters.colors]);

  const applyPrice = (lo: number, hi: number) => {
    setFilters((f) => ({ ...f, priceMin: lo, priceMax: hi }));
    if (priceFilterTimerRef.current) clearTimeout(priceFilterTimerRef.current);
    priceFilterTimerRef.current = setTimeout(() => {
      setPriceMinFilter(lo);
      setPriceMaxFilter(hi);
    }, 400);
  };

  const activePills: {
    key: string;
    label: string;
    swatch?: string;
    onRemove: () => void;
  }[] = [];

  if (enabled.includes("collection")) {
    for (const handle of resolvedFilters.collections) {
      const collection = collections.find((c) => c.handle === handle);
      activePills.push({
        key: `col-${handle}`,
        label: collection?.name ?? handle,
        onRemove: () => toggle("collections", handle),
      });
    }
  }

  if (priceActive) {
    activePills.push({
      key: "price",
      label: `${selectedCurrency.symbol}${Math.round(resolvedFilters.priceMin)} – ${selectedCurrency.symbol}${Math.round(resolvedFilters.priceMax)}`,
      onRemove: resetPrice,
    });
  }

  if (showColorFilter) {
    for (const name of resolvedFilters.colors) {
      const color = availableColors.find((c) => c.name === name);
      activePills.push({
        key: `color-${name}`,
        label: name,
        swatch: color?.hex,
        onRemove: () => toggle("colors", name),
      });
    }
  }

  const FilterPanel = (
    <div className="divide-y divide-[var(--border)]">
      {enabled.includes("collection") && (
        <FilterGroup
          title="Collections"
          count={
            resolvedFilters.collections.size
              ? resolvedFilters.collections.size
              : undefined
          }
        >
          <div className="mt-3 space-y-0.5">
            {collections.map((c) => (
              <CheckRow
                key={c.handle}
                label={c.name}
                checked={resolvedFilters.collections.has(c.handle)}
                onChange={() => toggle("collections", c.handle)}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      {enabled.includes("price") && (
        <FilterGroup
          title="Price"
          count={priceActive ? 1 : undefined}
          action={
            priceActive ? (
              <button
                type="button"
                onClick={resetPrice}
                className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-accent"
              >
                Reset
              </button>
            ) : undefined
          }
        >
          <div className="mt-3">
            <PriceRange
              min={priceBounds.min}
              max={priceBounds.max}
              valueMin={resolvedFilters.priceMin}
              valueMax={resolvedFilters.priceMax}
              currency={selectedCurrency}
              onChange={applyPrice}
            />
          </div>
        </FilterGroup>
      )}

      {showColorFilter && (
        <FilterGroup
          title="Colour"
          count={
            resolvedFilters.colors.size
              ? resolvedFilters.colors.size
              : undefined
          }
          action={
            resolvedFilters.colors.size ? (
              <button
                type="button"
                onClick={() =>
                  setFilters((f) => ({ ...f, colors: new Set() }))
                }
                className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-accent"
              >
                Clear
              </button>
            ) : undefined
          }
        >
          {availableColors.length > 10 && (
            <div
              className="mt-3 flex items-center gap-2 border px-2.5 py-2 transition-colors focus-within:border-accent"
              style={{ borderColor: "var(--border)" }}
            >
              <Search
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.25}
                aria-hidden
              />
              <input
                type="search"
                value={colorQuery}
                onChange={(e) => setColorQuery(e.target.value)}
                placeholder="Search colours"
                aria-label="Search colours"
                className="w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              {colorQuery ? (
                <button
                  type="button"
                  onClick={() => setColorQuery("")}
                  aria-label="Clear colour search"
                  className="text-muted-foreground transition-colors hover:text-accent"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.25} />
                </button>
              ) : null}
            </div>
          )}
          <div
            className="mt-3 flex max-h-64 flex-wrap content-start gap-1.5 overflow-y-auto overscroll-contain pr-0.5 sm:max-h-80"
            role="group"
            aria-label="Filter by colour"
          >
            {orderedColors.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No colours match “{colorQuery.trim()}”.
              </p>
            ) : (
              orderedColors.map((color) => (
                <ColorChip
                  key={color.name}
                  color={color}
                  checked={resolvedFilters.colors.has(color.name)}
                  onChange={() => toggle("colors", color.name)}
                />
              ))
            )}
          </div>
        </FilterGroup>
      )}
    </div>
  );

  const filterHeader = (opts?: { showClose?: boolean; onClose?: () => void }) => (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="tracked text-xs uppercase tracking-[0.2em] text-accent">
            Filter
          </span>
          {activeCount > 0 ? (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center px-1.5 text-[0.65rem] tabular-nums"
              style={{
                background: "var(--accent)",
                color: "var(--background)",
              }}
            >
              {activeCount}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {filtered.length} {resultsLabel}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-accent"
          >
            Clear all
          </button>
        ) : null}
        {opts?.showClose ? (
          <button
            type="button"
            onClick={opts.onClose}
            aria-label="Close filters"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={1} />
          </button>
        ) : null}
      </div>
    </div>
  );

  const activeFilterPills = activePills.length > 0 && (
    <div className="flex flex-wrap gap-1.5" aria-label="Active filters">
      {activePills.map((pill) => (
        <button
          key={pill.key}
          type="button"
          onClick={pill.onRemove}
          className="inline-flex min-h-8 max-w-full items-center gap-1.5 border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] transition touch-manipulation hover:border-accent"
          style={{
            borderColor: "var(--border)",
            color: "var(--foreground)",
            background: "color-mix(in srgb, var(--accent) 8%, transparent)",
          }}
          aria-label={`Remove filter ${pill.label}`}
        >
          {pill.swatch ? (
            <ShadeSwatch hex={pill.swatch} size="sm" label={pill.label} />
          ) : null}
          <span className="truncate">{pill.label}</span>
          <X className="h-3 w-3 shrink-0 opacity-60" strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );

  return (
    <section
      id={id}
      className="mx-auto max-w-[1600px] scroll-mt-28 px-6 py-12 md:px-10"
    >
      <Hairline />
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-4">
          {showSidebar && (
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="tracked -my-2 inline-flex min-h-11 items-center gap-2 py-2 md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1} />
              Filters
              {activeCount > 0 ? (
                <span
                  className="inline-flex h-5 min-w-5 items-center justify-center px-1.5 text-[0.65rem] tabular-nums"
                  style={{
                    background: "var(--accent)",
                    color: "var(--background)",
                  }}
                >
                  {activeCount}
                </span>
              ) : null}
            </button>
          )}
          <span className="hidden text-xs text-muted-foreground md:inline">
            {filtered.length} {resultsLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <span>Sort</span>
          <SortDropdown
            value={sort}
            options={sortOptions}
            onChange={setSort}
          />
        </div>
      </div>
      <Hairline />

      {/* Body */}
      <div
        className={
          showSidebar
            ? "mt-10 grid grid-cols-1 gap-10 md:grid-cols-[300px_1fr] lg:gap-12"
            : "mt-10"
        }
      >
        {showSidebar && (
          <aside className="hidden min-w-0 md:block">
            <div
              className="sticky top-28 flex max-h-[calc(100vh-8rem)] min-w-0 flex-col border"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="shrink-0 border-b px-5 py-4"
                style={{ borderColor: "var(--border)" }}
              >
                {filterHeader()}
              </div>
              {activeFilterPills ? (
                <div
                  className="shrink-0 border-b px-5 py-3"
                  style={{ borderColor: "var(--border)" }}
                >
                  {activeFilterPills}
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-1">
                {FilterPanel}
              </div>
            </div>
          </aside>
        )}

        <div>
          {filtered.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground">
              <p>{emptyMessage ?? "No pieces match this selection."}</p>
              {showSidebar && (
                <button onClick={reset} className="tracked mt-6 text-accent">
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div
                ref={gridRef}
                className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-8 sm:gap-y-16 lg:grid-cols-4"
              >
                {filtered.map((p, index) => (
                  <ProductTile
                    key={p.handle}
                    product={p}
                    priority={index < 4}
                    sizes="(min-width: 1024px) 25vw, 50vw"
                  />
                ))}
              </div>
              {paginationEnabled && (
                <PagePagination
                  currentPage={pagination.currentPage}
                  hasNextPage={pagination.hasNextPage}
                  hasPreviousPage={pagination.hasPreviousPage}
                  onNext={pagination.handleNextPage}
                  onPrevious={pagination.handlePrevPage}
                  isLoading={pagination.isLoading}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      {showSidebar && (
        <div
          className={`fixed inset-0 z-[60] transition-opacity duration-300 md:hidden ${
            drawer ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 cursor-pointer"
            style={{ background: "var(--backdrop-soft)" }}
            onClick={() => setDrawer(false)}
          />
          <div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className={`absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col outline-none transition-transform duration-300 ${
              drawer ? "translate-y-0" : "translate-y-full"
            }`}
            style={{ background: "var(--background)" }}
          >
            <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full" style={{ background: "var(--border)" }} />
            <div
              className="shrink-0 border-b px-5 pb-4 pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              {filterHeader({ showClose: true, onClose: () => setDrawer(false) })}
              {activeFilterPills ? (
                <div className="mt-3">{activeFilterPills}</div>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-1">
              {FilterPanel}
            </div>
            <div
              className="shrink-0 border-t px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
              style={{
                borderColor: "var(--border)",
                background: "var(--background)",
              }}
            >
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="btn-secondary btn-secondary-accent tracked w-full py-4"
              >
                Show {filtered.length} {resultsLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SortDropdown({
  value,
  options,
  onChange,
}: {
  value: SortKey;
  options: { id: SortKey; label: string }[];
  onChange: (key: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.id === value) ?? options[0];

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

  if (!selected) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 min-w-[12rem] items-center justify-between gap-3 border bg-transparent px-3 py-2 text-xs uppercase tracking-[0.25em] text-foreground transition-colors focus:outline-none"
        style={{ borderColor: open ? "var(--accent)" : "var(--border)" }}
      >
        <span>{selected.label}</span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 transition-transform"
          strokeWidth={1}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Sort by"
          className="absolute right-0 top-[calc(100%+0.375rem)] z-50 min-w-full border py-1 shadow-2xl"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {options.map((o) => {
            const active = o.id === value;
            return (
              <li key={o.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-4 px-3 py-2.5 text-left text-xs uppercase tracking-[0.25em] transition-colors hover:text-accent focus:text-accent focus:outline-none"
                  style={{ color: active ? "var(--accent)" : "var(--muted-foreground)" }}
                >
                  <span>{o.label}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.25} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="tracked text-xs uppercase tracking-[0.2em] text-foreground/70">
            {title}
          </div>
          {typeof count === "number" ? (
            <span className="text-[0.65rem] tabular-nums text-accent">
              {count}
            </span>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className="-mx-2 flex min-h-10 cursor-pointer items-center gap-3 px-2 text-sm transition hover:text-accent"
      style={{ color: checked ? "var(--foreground)" : "var(--muted-foreground)" }}
    >
      <span
        className="grid h-4 w-4 shrink-0 place-items-center border transition-colors"
        style={{
          borderColor: checked ? "var(--accent)" : "var(--border)",
          background: checked ? "var(--accent)" : "transparent",
        }}
      >
        {checked ? (
          <Check className="h-2.5 w-2.5" strokeWidth={2.5} style={{ color: "var(--background)" }} />
        ) : null}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
    </label>
  );
}

function ColorChip({
  color,
  checked,
  onChange,
}: {
  color: CatalogColor;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className="inline-flex min-h-9 items-center gap-2 border px-2.5 text-[0.65rem] uppercase tracking-[0.12em] transition touch-manipulation active:opacity-80"
      style={{
        borderColor: checked ? "var(--accent)" : "var(--border)",
        color: checked ? "var(--accent)" : "var(--muted-foreground)",
        backgroundColor: checked
          ? "color-mix(in srgb, var(--accent) 12%, transparent)"
          : "transparent",
      }}
    >
      {color.hex ? (
        <ShadeSwatch hex={color.hex} size="sm" label={color.name} />
      ) : (
        <span
          className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          aria-hidden
        />
      )}
      <span className="max-w-[9rem] truncate">{color.name}</span>
      {checked ? (
        <Check className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
      ) : null}
    </button>
  );
}

function PriceRange({
  min,
  max,
  valueMin,
  valueMax,
  currency,
  onChange,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  currency: ShopCurrencyOption;
  onChange: (lo: number, hi: number) => void;
}) {
  const baseId = useId();
  const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
  const boundMin = Math.round(min);
  const boundMax = Math.round(max);

  return (
    <fieldset className="m-0 w-full min-w-0 border-0 p-0">
      <legend className="sr-only">
        Price range in {currency.code}
      </legend>
      <div className="grid w-full min-w-0 grid-cols-2 gap-2">
        <PriceField
          id={`${baseId}-min`}
          label="Min"
          value={valueMin}
          min={min}
          max={valueMax}
          currency={currency}
          placeholder={String(boundMin)}
          onCommit={(v) => onChange(clamp(v, min, valueMax), valueMax)}
        />
        <PriceField
          id={`${baseId}-max`}
          label="Max"
          value={valueMax}
          min={valueMin}
          max={max}
          currency={currency}
          placeholder={String(boundMax)}
          onCommit={(v) => onChange(valueMin, clamp(v, valueMin, max))}
        />
      </div>
    </fieldset>
  );
}

function PriceField({
  id,
  label,
  value,
  min,
  max,
  currency,
  placeholder,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  currency: ShopCurrencyOption;
  placeholder: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(Math.round(value)));

  useEffect(() => {
    setDraft(String(Math.round(value)));
  }, [value]);

  const commit = () => {
    if (draft.trim() === "") {
      setDraft(String(Math.round(value)));
      return;
    }
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(Math.round(value)));
      return;
    }
    const next = Math.min(Math.max(Math.round(parsed), Math.round(min)), Math.round(max));
    setDraft(String(next));
    if (next !== Math.round(value)) {
      onCommit(next);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-1.5">
      <label
        htmlFor={id}
        className="tracked block text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground"
      >
        {label}
      </label>
      <div
        className="flex w-full min-w-0 items-center gap-1 overflow-hidden border px-2 py-2.5 transition-colors focus-within:border-accent"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="shrink-0 text-xs leading-none text-muted-foreground"
          aria-hidden
        >
          {currency.symbol}
        </span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          placeholder={placeholder}
          value={draft}
          aria-label={`${label} price (${currency.code})`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="w-full min-w-0 flex-1 bg-transparent text-base tabular-nums text-foreground placeholder:text-muted-foreground/50 [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}
