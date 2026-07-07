import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { Product } from "~/models/types";
import { useCatalog } from "~/contexts/catalog-context";
import { ProductTile } from "~/components/gulriza/ProductTile";
import { Hairline } from "~/components/gulriza/Eyebrow";
import { useLocalization } from "~/contexts/localization-context";
import type { ShopCurrencyOption } from "~/lib/localization";
import { useFocusTrap } from "~/hooks/use-focus-trap";
import { lockScroll, unlockScroll } from "~/lib/scroll-lock";
import { ShadeDropdown } from "~/components/gulriza/ShadeDropdown";
import { collectShadesFromProducts, getDefaultSolidShadeCode } from "~/lib/solid-product";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "best-selling";

export type FilterKey = "collection" | "price" | "color";

type Filters = {
  collections: Set<string>;
  priceMin: number;
  priceMax: number;
  colorCode: string;
};

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price — Low to High" },
  { id: "price-desc", label: "Price — High to Low" },
  { id: "best-selling", label: "Best Selling" },
];

export function ProductCatalog({
  products,
  filters: enabled = ["collection", "price"],
  resultsLabel = "pieces",
  emptyMessage,
  id,
}: {
  products: Product[];
  /** Which filter facets to show. Pass [] to hide sidebar entirely (sort-only). */
  filters?: FilterKey[];
  resultsLabel?: string;
  /** Override empty grid copy (e.g. collection pages with no filters). */
  emptyMessage?: string;
  /** Anchor id for in-page navigation (e.g. collection page section nav). */
  id?: string;
}) {
  const { collections } = useCatalog();
  const priceBounds = useMemo(() => {
    const all = products.map((p) => p.price.amount);
    const min = all.length ? Math.min(...all) : 0;
    const max = all.length ? Math.max(...all) : 0;
    return { min, max };
  }, [products]);

  const availableShades = useMemo(
    () => (enabled.includes("color") ? collectShadesFromProducts(products) : []),
    [enabled, products],
  );
  const defaultColorCode = useMemo(
    () => getDefaultSolidShadeCode(availableShades),
    [availableShades],
  );

  const initial: Filters = {
    collections: new Set(),
    priceMin: priceBounds.min,
    priceMax: priceBounds.max,
    colorCode: defaultColorCode,
  };

  const showColorFilter = enabled.includes("color") && availableShades.length > 0;

  const [filters, setFilters] = useState<Filters>(initial);
  const [sort, setSort] = useState<SortKey>("featured");
  const [drawer, setDrawer] = useState(false);
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
    let list = products.slice();
    if (enabled.includes("collection") && resolvedFilters.collections.size)
      list = list.filter((p) => resolvedFilters.collections.has(p.collectionSlug));
    if (enabled.includes("price"))
      list = list.filter(
        (p) =>
          p.price.amount >= resolvedFilters.priceMin &&
          p.price.amount <= resolvedFilters.priceMax,
      );

    if (sort === "price-asc") list.sort((a, b) => a.price.amount - b.price.amount);
    else if (sort === "price-desc") list.sort((a, b) => b.price.amount - a.price.amount);
    else if (sort === "newest")
      list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    else if (sort === "best-selling")
      list.sort((a, b) => {
        const score = (p: Product) =>
          (p.tags?.some((t) => /best-?sell/i.test(t)) ? 2 : 0) +
          (p.limited ? 1 : 0);
        return score(b) - score(a);
      });
    return list;
  }, [enabled, resolvedFilters, sort, products]);

  const toggle = (key: "collections", value: string) => {
    setFilters((f) => {
      const next = { ...f, [key]: new Set(f[key]) } as Filters;
      const s = next[key] as Set<string>;
      if (s.has(value)) s.delete(value);
      else s.add(value);
      return next;
    });
  };

  const activeCount =
    (enabled.includes("collection") ? resolvedFilters.collections.size : 0) +
    (enabled.includes("price") &&
    (resolvedFilters.priceMin !== priceBounds.min ||
      resolvedFilters.priceMax !== priceBounds.max)
      ? 1
      : 0) +
    (showColorFilter && resolvedFilters.colorCode !== defaultColorCode ? 1 : 0);

  const reset = () => setFilters(initial);

  const FilterPanel = (
    <div className="space-y-10">
      {enabled.includes("collection") && (
        <FilterGroup title="Collections">
          {collections.map((c) => (
            <CheckRow
              key={c.handle}
              label={c.name}
              checked={resolvedFilters.collections.has(c.handle)}
              onChange={() => toggle("collections", c.handle)}
            />
          ))}
        </FilterGroup>
      )}

      {enabled.includes("price") && (
        <FilterGroup title="Price">
          <PriceRange
            min={priceBounds.min}
            max={priceBounds.max}
            valueMin={resolvedFilters.priceMin}
            valueMax={resolvedFilters.priceMax}
            currency={selectedCurrency}
            onChange={(lo, hi) => setFilters((f) => ({ ...f, priceMin: lo, priceMax: hi }))}
          />
        </FilterGroup>
      )}

      {showColorFilter && (
        <FilterGroup title="Colour">
          <ShadeDropdown
            shades={availableShades}
            selectedCode={resolvedFilters.colorCode}
            onSelect={(colorCode) => setFilters((f) => ({ ...f, colorCode }))}
            showLabel={false}
          />
        </FilterGroup>
      )}

      {activeCount > 0 && (
        <button onClick={reset} className="tracked text-accent">
          Clear filters ({activeCount})
        </button>
      )}
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
              Filters {activeCount > 0 && `(${activeCount})`}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <span>Sort</span>
          <SortDropdown value={sort} onChange={setSort} />
        </div>
      </div>
      <Hairline />

      {/* Body */}
      <div
        className={showSidebar ? "mt-10 grid grid-cols-1 gap-12 md:grid-cols-[260px_1fr]" : "mt-10"}
      >
        {showSidebar && (
          <aside className="hidden md:block">
            <div className="sticky top-32">
              <div className="tracked text-accent">Filter</div>
              <div className="mt-8">{FilterPanel}</div>
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
            <div className="grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-16 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductTile key={p.handle} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawer && showSidebar && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={() => setDrawer(false)}
          />
          <div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col overflow-y-auto p-6 outline-none"
            style={{
              background: "var(--background)",
              paddingTop: "max(1.5rem, env(safe-area-inset-top))",
              paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex items-center justify-between pb-6">
              <span className="tracked text-accent">Filter</span>
              <button onClick={() => setDrawer(false)} aria-label="Close filters">
                <X className="h-5 w-5" strokeWidth={1} />
              </button>
            </div>
            {FilterPanel}
            <button
              onClick={() => setDrawer(false)}
              className="btn-secondary btn-secondary-accent tracked mt-10 w-full py-4"
            >
              Show {filtered.length} {resultsLabel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (key: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = SORT_OPTIONS.find((o) => o.id === value) ?? SORT_OPTIONS[0];

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
          {SORT_OPTIONS.map((o) => {
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

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="tracked text-foreground">{title}</div>
      <div className="mt-4 space-y-2.5">{children}</div>
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
    <label className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground transition hover:text-accent">
      <span
        className="grid h-4 w-4 place-items-center border"
        style={{
          borderColor: checked ? "var(--accent)" : "var(--border)",
          background: checked ? "var(--accent)" : "transparent",
        }}
      >
        {checked && <span className="h-1.5 w-1.5" style={{ background: "var(--background)" }} />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span style={{ color: checked ? "var(--foreground)" : undefined }}>{label}</span>
    </label>
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
  const step = 50;
  const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
  const leftPct = ((valueMin - min) / (max - min)) * 100;
  const rightPct = ((valueMax - min) / (max - min)) * 100;

  return (
    <div className="pt-2">
      <div className="relative h-11">
        <div
          className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
          style={{ background: "var(--border)" }}
        />
        <div
          className="absolute top-1/2 h-px -translate-y-1/2"
          style={{
            left: `${leftPct}%`,
            right: `${100 - rightPct}%`,
            background: "var(--accent)",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), valueMax - step);
            onChange(v, valueMax);
          }}
          className="range-thumb"
          aria-label="Minimum price"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), valueMin + step);
            onChange(valueMin, v);
          }}
          className="range-thumb"
          aria-label="Maximum price"
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <PriceField
          label="Minimum price"
          value={valueMin}
          min={min}
          max={valueMax}
          step={step}
          currency={currency}
          onCommit={(v) => onChange(clamp(v, min, valueMax), valueMax)}
        />
        <span className="text-xs text-muted-foreground">—</span>
        <PriceField
          label="Maximum price"
          value={valueMax}
          min={valueMin}
          max={max}
          step={step}
          currency={currency}
          onCommit={(v) => onChange(valueMin, clamp(v, valueMin, max))}
        />
      </div>
    </div>
  );
}

function PriceField({
  label,
  value,
  min,
  max,
  step,
  currency,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  currency: ShopCurrencyOption;
  onCommit: (value: number) => void;
}) {
  return (
    <label
      className="flex flex-1 items-center gap-1 border px-2.5 py-2 focus-within:border-accent"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="sr-only">{label}</span>
      <span className="text-xs text-muted-foreground">{currency.symbol}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={Math.round(value)}
        aria-label={label}
        onChange={(e) => {
          if (e.target.value === "") return;
          onCommit(Number(e.target.value));
        }}
        className="w-full bg-transparent text-base text-foreground focus:outline-none"
      />
    </label>
  );
}
