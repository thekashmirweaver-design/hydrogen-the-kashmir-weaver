import {useMemo, useState} from 'react';
import {Search} from 'lucide-react';
import type {Shade} from '~/models/types';
import {HorizontalScrollCue} from '~/components/gulriza/HorizontalScrollCue';
import {SelectedColourCard} from '~/components/gulriza/SelectedColourCard';
import {findShadeByCode} from '~/lib/solid-product';

export function collectShadeFamilies(shades: Shade[]): string[] {
  const seen = new Set<string>();
  const families: string[] = [];
  for (const shade of shades) {
    if (seen.has(shade.family)) continue;
    seen.add(shade.family);
    families.push(shade.family);
  }
  return families.sort((a, b) => a.localeCompare(b));
}

function filterShades(
  shades: Shade[],
  query: string,
  family: string | null,
): Shade[] {
  let result = shades;
  if (family) {
    result = result.filter((shade) => shade.family === family);
  }
  const q = query.trim().toLowerCase();
  if (!q) return result;
  return result.filter(
    (shade) =>
      shade.code.toLowerCase().includes(q) ||
      shade.family.toLowerCase().includes(q) ||
      shade.hex.toLowerCase().includes(q),
  );
}

function SwatchButton({
  shade,
  selected,
  onSelect,
}: {
  shade: Shade;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      aria-label={`${shade.code} · ${shade.family}`}
      aria-pressed={selected}
      title={`${shade.code} · ${shade.family}`}
      className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      style={{
        backgroundColor: shade.hex,
        boxShadow: selected
          ? '0 0 0 2px var(--background), 0 0 0 3px var(--accent)'
          : 'inset 0 0 0 1px rgba(255,255,255,0.15), 0 0 0 1px var(--border)',
      }}
    />
  );
}

/** Search, family filters, and swatch grid. */
export function ShadeSwatchPicker({
  shades,
  selectedCode,
  onSelect,
  className = '',
  showSelected = true,
  scrollSwatches = true,
  showCount = true,
}: {
  shades: Shade[];
  selectedCode: string;
  onSelect: (code: string) => void;
  className?: string;
  showSelected?: boolean;
  /** When false, swatches flow in the parent scroll container. */
  scrollSwatches?: boolean;
  showCount?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<string | null>(null);

  const families = useMemo(() => collectShadeFamilies(shades), [shades]);

  const selectedShade = useMemo(
    () => findShadeByCode(shades, selectedCode) ?? shades[0] ?? null,
    [shades, selectedCode],
  );

  const filtered = useMemo(
    () => filterShades(shades, query, family),
    [shades, query, family],
  );

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      {showSelected && selectedShade ? (
        <div className="mb-3 shrink-0">
          <SelectedColourCard shade={selectedShade} label="Selected" />
        </div>
      ) : null}

      <div className="relative mb-3 shrink-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code, name, or hex…"
          aria-label="Search colours"
          className="w-full border bg-transparent py-2.5 pl-10 pr-3 text-base tracking-[0.04em] placeholder:text-muted-foreground focus:border-[var(--accent)] focus:outline-none"
          style={{borderColor: 'var(--border)'}}
        />
      </div>

      {families.length > 1 ? (
        <HorizontalScrollCue
          cueLabel="Swipe"
          cueClassName="lg:hidden"
          className="no-scrollbar mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={family === null}
            onClick={() => setFamily(null)}
            className="shrink-0 border px-3 py-1.5 text-[0.65rem] tracking-[0.14em] uppercase transition min-h-11 inline-flex items-center"
            style={{
              borderColor: family === null ? 'var(--accent)' : 'var(--border)',
              color: family === null ? 'var(--accent)' : 'var(--muted-foreground)',
            }}
          >
            All
          </button>
          {families.map((name) => {
            const active = family === name;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFamily(name)}
                className="shrink-0 border px-3 py-1.5 text-[0.65rem] tracking-[0.14em] uppercase transition min-h-11 inline-flex items-center touch-manipulation active:opacity-80"
                style={{
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  color: active ? 'var(--accent)' : 'var(--muted-foreground)',
                }}
              >
                {name}
              </button>
            );
          })}
        </HorizontalScrollCue>
      ) : null}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No colours match your filters.
        </p>
      ) : (
        <>
          <div
            className={
              scrollSwatches
                ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain'
                : ''
            }
            style={scrollSwatches ? {WebkitOverflowScrolling: 'touch'} : undefined}
          >
            <div className="flex flex-wrap gap-2.5 pb-2">
              {filtered.map((shade) => (
                <SwatchButton
                  key={shade.code}
                  shade={shade}
                  selected={shade.code === selectedCode}
                  onSelect={() => onSelect(shade.code)}
                />
              ))}
            </div>
          </div>

          {showCount ? (
            <p className="mt-2 shrink-0 text-center text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
              {filtered.length} colour{filtered.length === 1 ? '' : 's'}
              {family || query.trim() ? ' shown' : ''}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
