import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIsomorphicLayoutEffect} from '~/hooks/use-isomorphic-layout-effect';
import {useVirtualizer} from '@tanstack/react-virtual';
import {Check, ChevronDown, ChevronLeft, ChevronRight} from 'lucide-react';
import type {Shade} from '~/models/types';
import {ShadeSwatch} from '~/components/gulriza/ShadeSwatch';
import {findShadeByCode} from '~/lib/solid-product';

const SHADES_PER_PAGE = 40;
const ROW_HEIGHT = 56;

function shadeLabel(shade: Shade): string {
  return `${shade.code} · ${shade.family}`;
}

function pageForShadeIndex(index: number): number {
  return Math.max(0, Math.floor(index / SHADES_PER_PAGE));
}

/** Compact dropdown for catalog filters — not used in Try Colours studio. */
export function ShadeDropdown({
  shades,
  selectedCode,
  onSelect,
  label = 'Colour',
  showLabel = true,
}: {
  shades: Shade[];
  selectedCode: string;
  onSelect: (code: string) => void;
  label?: string;
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const onScrollRef = useCallback((node: HTMLDivElement | null) => {
    setScrollElement(node);
  }, []);

  const selectedShade = useMemo(
    () => findShadeByCode(shades, selectedCode) ?? shades[0] ?? null,
    [selectedCode, shades],
  );

  const selectedSummary = selectedShade ? shadeLabel(selectedShade) : label;
  const pageCount = Math.max(1, Math.ceil(shades.length / SHADES_PER_PAGE));

  const pageShades = useMemo(() => {
    const start = page * SHADES_PER_PAGE;
    return shades.slice(start, start + SHADES_PER_PAGE);
  }, [page, shades]);

  const virtualizer = useVirtualizer({
    count: open ? pageShades.length : 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  useIsomorphicLayoutEffect(() => {
    if (!open || !scrollElement) return;
    virtualizer.measure();
    const idxInPage = pageShades.findIndex((shade) => shade.code === selectedCode);
    if (idxInPage >= 0) {
      virtualizer.scrollToIndex(idxInPage, {align: 'center'});
    }
  }, [open, scrollElement, page, selectedCode, pageShades.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = shades.findIndex((shade) => shade.code === selectedCode);
    setPage(pageForShadeIndex(Math.max(0, selectedIndex)));
  }, [open, selectedCode, shades]);

  if (!shades.length || !selectedShade) return null;

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(0, nextPage), pageCount - 1));
    scrollElement?.scrollTo({top: 0});
  };

  return (
    <div ref={wrapRef} className="relative">
      {showLabel ? <span className="eyebrow mb-1.5 block">{label}</span> : null}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selectedSummary}`}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center justify-between gap-4 border bg-transparent px-4 py-3 text-left transition-colors duration-300 focus:outline-none"
        style={{borderColor: open ? 'var(--accent)' : 'var(--border)'}}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <ShadeSwatch hex={selectedShade.hex} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm tracking-[0.06em] text-foreground">
              {selectedSummary}
            </span>
            <span className="mt-0.5 block truncate text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
              {selectedShade.hex}
            </span>
          </span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300"
          strokeWidth={1}
          style={{transform: open ? 'rotate(180deg)' : undefined}}
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 border shadow-2xl"
          style={{background: 'var(--surface)', borderColor: 'var(--border)'}}
        >
          <div
            ref={onScrollRef}
            className="max-h-64 overflow-y-auto overscroll-contain"
          >
            <ul
              role="listbox"
              aria-label={label}
              className="relative w-full py-1"
              style={{height: virtualizer.getTotalSize()}}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const shade = pageShades[virtualRow.index];
                if (!shade) return null;
                const active = selectedCode === shade.code;
                return (
                  <li
                    key={shade.code}
                    role="option"
                    aria-selected={active}
                    className="absolute left-0 top-0 w-full"
                    style={{
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(shade.code);
                        setOpen(false);
                        triggerRef.current?.focus();
                      }}
                      className="flex h-full w-full touch-manipulation items-center justify-between gap-4 px-4 text-left transition-colors hover:text-accent focus:text-accent focus:outline-none active:opacity-80"
                      style={{color: active ? 'var(--accent)' : 'var(--foreground)'}}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <ShadeSwatch hex={shade.hex} size="sm" />
                        <span className="min-w-0">
                          <span
                            className="block truncate text-sm"
                            style={{fontWeight: active ? 400 : 300}}
                          >
                            {shadeLabel(shade)}
                          </span>
                          <span className="mt-1 block truncate text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                            {shade.hex}
                          </span>
                        </span>
                      </span>
                      {active ? (
                        <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.25} />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {pageCount > 1 ? (
            <div
              className="flex items-center justify-between gap-2 border-t px-3 py-2"
              style={{borderColor: 'var(--border)'}}
            >
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page === 0}
                aria-label="Previous page"
                className="touch-target flex min-h-11 min-w-11 shrink-0 items-center justify-center transition hover:text-accent active:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1} />
              </button>
              <span className="text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
                Page {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= pageCount - 1}
                aria-label="Next page"
                className="touch-target flex min-h-11 min-w-11 shrink-0 items-center justify-center transition hover:text-accent active:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
