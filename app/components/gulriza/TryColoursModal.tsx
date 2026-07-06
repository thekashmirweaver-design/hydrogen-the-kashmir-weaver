import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft, Check, Expand, Search, X} from 'lucide-react';
import type {Shade} from '~/models/types';
import {
  ColourStudioPreview,
  PreviewViewToggle,
} from '~/components/gulriza/ColourStudioPreview';
import {useFocusTrap} from '~/hooks/use-focus-trap';
import {useIsLgUp} from '~/hooks/use-is-lg-up';
import {prefetchRecolorAssets} from '~/hooks/use-recolor-assets';
import {
  SOLID_COLOUR_DISCLAIMER,
  SOLID_RECOLOR_IMAGE_SETS,
} from '~/lib/solid-product';
import {lockScroll, unlockScroll} from '~/lib/scroll-lock';
import {
  groupShadesByTone,
  isLightHex,
  toneOf,
  type ToneKey,
} from '~/lib/shade-tones';

type MobileScreen = 'main' | 'zoom' | 'browse';
type ToneFilter = ToneKey | 'all';

const SHORT_DISCLAIMER =
  'Preview is a guide — the finished colour may vary slightly.';

function filterByQuery(shades: Shade[], query: string): Shade[] {
  const q = query.trim().toLowerCase();
  if (!q) return shades;
  return shades.filter(
    (s) =>
      s.code.toLowerCase().includes(q) ||
      s.family.toLowerCase().includes(q) ||
      s.hex.toLowerCase().includes(q),
  );
}

/* -------------------------------------------------------------------------- */
/* Swatch                                                                     */
/* -------------------------------------------------------------------------- */

const SWATCH_SIZE = {
  rail: 'h-14 w-14',
  grid: 'h-[3.25rem] w-[3.25rem]',
} as const;

function Swatch({
  shade,
  selected,
  onSelect,
  size,
}: {
  shade: Shade;
  selected: boolean;
  onSelect: () => void;
  size: keyof typeof SWATCH_SIZE;
}) {
  const tickDark = isLightHex(shade.hex);
  return (
    <button
      type="button"
      data-code={shade.code}
      onClick={onSelect}
      aria-label={`${shade.family} — ${shade.code}`}
      aria-pressed={selected}
      title={`${shade.family} · ${shade.code}`}
      className={`${SWATCH_SIZE[size]} relative flex shrink-0 touch-manipulation items-center justify-center rounded-full transition-transform duration-150 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]`}
      style={{
        backgroundColor: shade.hex,
        boxShadow: selected
          ? '0 0 0 2px var(--background), 0 0 0 3.5px var(--accent)'
          : 'inset 0 0 0 1px rgba(255,255,255,0.16), 0 0 0 1px var(--border)',
      }}
    >
      {selected ? (
        <Check
          className="h-5 w-5"
          strokeWidth={2.4}
          style={{color: tickDark ? 'rgba(8,16,15,0.85)' : '#fff'}}
          aria-hidden
        />
      ) : null}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Tone chips                                                                 */
/* -------------------------------------------------------------------------- */

function ToneChips({
  groups,
  active,
  onSelect,
  className = '',
}: {
  groups: {tone: ToneKey; swatchHex: string; shades: Shade[]}[];
  active: ToneFilter;
  onSelect: (tone: ToneFilter) => void;
  className?: string;
}) {
  const chip = (
    key: string,
    label: string,
    isActive: boolean,
    onClick: () => void,
    dot?: string,
  ) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className="group inline-flex min-h-11 shrink-0 items-center gap-2 border px-3.5 text-[0.7rem] uppercase tracking-[0.14em] transition touch-manipulation active:opacity-80"
      style={{
        borderColor: isActive ? 'var(--accent)' : 'var(--border)',
        color: isActive ? 'var(--accent)' : 'var(--muted-foreground)',
        backgroundColor: isActive
          ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
          : 'transparent',
      }}
    >
      {dot ? (
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{
            backgroundColor: dot,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
          }}
          aria-hidden
        />
      ) : null}
      {label}
    </button>
  );

  return (
    <div
      role="tablist"
      aria-label="Filter colours by tone"
      className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`}
    >
      {chip('all', 'All', active === 'all', () => onSelect('all'))}
      {groups.map((g) =>
        chip(g.tone, g.tone, active === g.tone, () => onSelect(g.tone), g.swatchHex),
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sectioned grid (desktop + browse)                                          */
/* -------------------------------------------------------------------------- */

function ColourGrid({
  groups,
  selectedCode,
  onSelect,
  showHeaders,
}: {
  groups: {tone: ToneKey; shades: Shade[]}[];
  selectedCode: string;
  onSelect: (code: string) => void;
  showHeaders: boolean;
}) {
  if (groups.every((g) => g.shades.length === 0)) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No colours match your search.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) =>
        g.shades.length === 0 ? null : (
          <section key={g.tone}>
            {showHeaders ? (
              <div className="mb-3 flex items-baseline gap-2">
                <h3 className="font-display text-lg tracking-wide">{g.tone}</h3>
                <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {g.shades.length}
                </span>
              </div>
            ) : null}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] justify-items-center gap-3">
              {g.shades.map((shade) => (
                <Swatch
                  key={shade.code}
                  shade={shade}
                  selected={shade.code === selectedCode}
                  onSelect={() => onSelect(shade.code)}
                  size="grid"
                />
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Selected colour caption                                                    */
/* -------------------------------------------------------------------------- */

function ColourCaption({
  shade,
  align = 'center',
}: {
  shade: Shade;
  align?: 'center' | 'left';
}) {
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      <p className="font-display text-2xl leading-tight tracking-wide">
        {shade.family}
      </p>
      <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
        Colour {shade.code}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

export function TryColoursModal({
  open,
  onClose,
  productName,
  shades,
  selectedCode,
  onSelectShade,
  imageIdx,
  onImageIdxChange,
  priceLabel,
  purchaseControls,
}: {
  open: boolean;
  onClose: () => void;
  productName: string;
  shades: Shade[];
  selectedCode: string;
  onSelectShade: (code: string) => void;
  imageIdx: number;
  onImageIdxChange: (idx: number) => void;
  priceLabel?: string;
  purchaseControls?: ReactNode;
}) {
  const isLgUp = useIsLgUp();
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const [screen, setScreen] = useState<MobileScreen>('main');
  const [tone, setTone] = useState<ToneFilter>('all');
  const [query, setQuery] = useState('');
  const [entered, setEntered] = useState(false);

  const isOverlayOpen = !isLgUp && screen !== 'main';

  const groups = useMemo(() => groupShadesByTone(shades), [shades]);

  const selectedShade =
    shades.find((s) => s.code === selectedCode) ?? shades[0] ?? null;
  const activeSet =
    SOLID_RECOLOR_IMAGE_SETS[imageIdx] ?? SOLID_RECOLOR_IMAGE_SETS[0]!;

  // Rail shades = the shades for the active tone (or all), in palette order.
  const railShades = useMemo(() => {
    if (tone === 'all') return shades;
    return groups.find((g) => g.tone === tone)?.shades ?? shades;
  }, [tone, groups, shades]);

  // Grid groups honour the browse-search query.
  const browseGroups = useMemo(() => {
    const filtered = filterByQuery(shades, query);
    return groupShadesByTone(filtered);
  }, [shades, query]);

  useFocusTrap(open && !isOverlayOpen, dialogRef);
  useFocusTrap(open && isOverlayOpen, overlayRef);

  useEffect(() => {
    if (!open) return;
    setScreen('main');
    setTone('all');
    setQuery('');
    prefetchRecolorAssets(activeSet.id);
    lockScroll();
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => {
      unlockScroll();
      cancelAnimationFrame(raf);
      setEntered(false);
    };
  }, [open, activeSet.id]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && isOverlayOpen) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }, [open, isOverlayOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isOverlayOpen) setScreen('main');
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, isOverlayOpen]);

  // Keep the selected swatch centred in the mobile rail.
  useEffect(() => {
    if (!open || isLgUp || screen !== 'main') return;
    const rail = railRef.current;
    if (!rail) return;
    const el = rail.querySelector<HTMLElement>(
      `[data-code="${CSS.escape(selectedCode)}"]`,
    );
    el?.scrollIntoView({inline: 'center', block: 'nearest', behavior: 'smooth'});
  }, [open, isLgUp, screen, selectedCode, tone]);

  const handleSelect = useCallback(
    (code: string) => onSelectShade(code),
    [onSelectShade],
  );

  const handleSelectFromBrowse = useCallback(
    (code: string) => {
      onSelectShade(code);
      const nextTone = toneOf(
        shades.find((s) => s.code === code)?.hex ?? '#000000',
      );
      setTone(nextTone);
      setScreen('main');
    },
    [onSelectShade, shades],
  );

  if (!open || typeof document === 'undefined') return null;

  const previewProps = {
    hex: selectedShade?.hex,
    imageSetId: activeSet.id,
    productName,
    imageLabel: activeSet.label,
  };

  const iconBtn =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition hover:text-accent';

  /* --------------------------- mobile: purchase bar --------------------- */

  const purchaseBar = (
    <div
      className="shrink-0 space-y-3 border-t bg-[var(--background)] px-4 pt-3"
      style={{
        borderColor: 'var(--border)',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      {selectedShade ? (
        <div className="flex items-center gap-2.5">
          <span
            className="h-6 w-6 shrink-0 rounded-full"
            style={{
              backgroundColor: selectedShade.hex,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2), 0 0 0 1px var(--border)',
            }}
            aria-hidden
          />
          <p className="min-w-0 flex-1 truncate text-sm tracking-[0.03em] text-foreground">
            {selectedShade.family}
          </p>
          {priceLabel ? (
            <p className="shrink-0 text-sm text-foreground">{priceLabel}</p>
          ) : null}
        </div>
      ) : null}

      {purchaseControls ? (
        <div className="space-y-2.5">{purchaseControls}</div>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 tracked transition hover:opacity-90"
          style={{background: 'var(--accent)', color: 'var(--background)'}}
        >
          Apply colour
        </button>
      )}

      <p className="text-center text-[0.58rem] leading-snug text-muted-foreground">
        {SHORT_DISCLAIMER}
      </p>
    </div>
  );

  /* ------------------------------ mobile: main -------------------------- */

  const mobileMain = (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Preview stage — flexes to fill available height so nothing below clips */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-2">
        <button
          type="button"
          onClick={() => setScreen('zoom')}
          aria-label="Enlarge preview"
          className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden border transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] touch-manipulation"
          style={{borderColor: 'var(--border)', background: 'var(--surface)'}}
        >
          <ColourStudioPreview {...previewProps} size="stage" />
          <span
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full"
            style={{background: 'rgba(8,16,15,0.5)', border: '1px solid var(--border)'}}
          >
            <Expand className="h-4 w-4" strokeWidth={1.25} aria-hidden />
          </span>
        </button>
        {selectedShade ? (
          <div className="shrink-0 pb-1 pt-2">
            <ColourCaption shade={selectedShade} />
          </div>
        ) : null}
      </div>

      {/* Tone nav */}
      <div
        className="shrink-0 space-y-3 border-t px-4 pb-2 pt-3"
        style={{borderColor: 'var(--border)'}}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            Choose a colour
          </p>
          <button
            type="button"
            onClick={() => setScreen('browse')}
            className="inline-flex items-center gap-1.5 border px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-foreground transition hover:text-accent touch-manipulation"
            style={{borderColor: 'var(--border)'}}
          >
            <Search className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            Browse all {shades.length}
          </button>
        </div>
        <ToneChips groups={groups} active={tone} onSelect={setTone} />
      </div>

      {/* Swipeable rail — fixed comfortable height, swatches never clip */}
      <div
        ref={railRef}
        className="no-scrollbar flex h-[5.5rem] shrink-0 items-center gap-3 overflow-x-auto px-4"
        style={{WebkitOverflowScrolling: 'touch', scrollSnapType: 'x proximity'}}
      >
        {railShades.map((shade) => (
          <div key={shade.code} style={{scrollSnapAlign: 'center'}}>
            <Swatch
              shade={shade}
              selected={shade.code === selectedCode}
              onSelect={() => handleSelect(shade.code)}
              size="rail"
            />
          </div>
        ))}
      </div>

      {purchaseBar}
    </section>
  );

  /* --------------------------- mobile: overlays ------------------------- */

  const overlayShell = (
    label: string,
    body: ReactNode,
    footer?: ReactNode,
  ) =>
    createPortal(
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="studio-slide-up fixed inset-0 z-[210] flex h-[100dvh] flex-col overflow-hidden bg-[var(--background)] motion-reduce:transition-none"
        style={{transform: entered ? 'translateY(0)' : 'translateY(100%)'}}
      >
        <header
          className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
          style={{
            borderColor: 'var(--border)',
            paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          }}
        >
          <button
            type="button"
            onClick={() => setScreen('main')}
            aria-label="Back"
            className={iconBtn}
            style={{borderColor: 'var(--border)'}}
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.25} />
          </button>
          <p className="font-display text-lg tracking-wide">{label}</p>
        </header>
        {body}
        {footer}
      </div>,
      document.body,
    );

  const zoomOverlay =
    !isLgUp && screen === 'zoom'
      ? overlayShell(
          'Full preview',
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
            <ColourStudioPreview {...previewProps} size="full" />
            <div className="mt-4 space-y-4">
              <PreviewViewToggle
                imageIdx={imageIdx}
                onImageIdxChange={onImageIdxChange}
                className="w-full"
              />
              {selectedShade ? <ColourCaption shade={selectedShade} /> : null}
            </div>
          </div>,
          <div
            className="shrink-0 border-t px-4 pt-3"
            style={{
              borderColor: 'var(--border)',
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            }}
          >
            <button
              type="button"
              onClick={() => setScreen('main')}
              className="btn-preview w-full py-3.5 tracked touch-manipulation"
            >
              Back to colours
            </button>
          </div>,
        )
      : null;

  const browseOverlay =
    !isLgUp && screen === 'browse'
      ? overlayShell(
          'All colours',
          <>
            <div
              className="shrink-0 space-y-3 border-b px-4 pb-3 pt-3"
              style={{borderColor: 'var(--border)'}}
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={1.25}
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, code, or hex…"
                  aria-label="Search colours"
                  className="w-full border bg-transparent py-3 pl-10 pr-3 text-base tracking-[0.03em] placeholder:text-muted-foreground focus:border-[var(--accent)] focus:outline-none"
                  style={{borderColor: 'var(--border)'}}
                />
              </div>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
              style={{WebkitOverflowScrolling: 'touch'}}
            >
              <ColourGrid
                groups={browseGroups}
                selectedCode={selectedCode}
                onSelect={handleSelectFromBrowse}
                showHeaders
              />
            </div>
          </>,
        )
      : null;

  /* ------------------------------- desktop ------------------------------ */

  const desktopGroups = tone === 'all' ? browseGroups : browseGroups.filter((g) => g.tone === tone);

  const desktopBody = (
    <>
      {/* Preview stage */}
      <section
        className="flex min-h-0 flex-col border-r px-10 py-8 lg:flex-1"
        style={{borderColor: 'var(--border)'}}
      >
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
          <ColourStudioPreview {...previewProps} size="desktop" />
          <PreviewViewToggle
            imageIdx={imageIdx}
            onImageIdxChange={onImageIdxChange}
          />
          {selectedShade ? <ColourCaption shade={selectedShade} /> : null}
        </div>
      </section>

      {/* Colour library */}
      <section className="flex min-h-0 flex-col overflow-hidden lg:w-[30rem] lg:shrink-0">
        <div
          className="shrink-0 space-y-3 border-b px-8 pb-4 pt-6"
          style={{borderColor: 'var(--border)'}}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="eyebrow">Choose a colour</p>
            <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
              {shades.length} shades
            </span>
          </div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.25}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code, or hex…"
              aria-label="Search colours"
              className="w-full border bg-transparent py-2.5 pl-10 pr-3 text-sm tracking-[0.03em] placeholder:text-muted-foreground focus:border-[var(--accent)] focus:outline-none"
              style={{borderColor: 'var(--border)'}}
            />
          </div>
          <ToneChips groups={groups} active={tone} onSelect={setTone} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-8 py-5">
          <ColourGrid
            groups={desktopGroups}
            selectedCode={selectedCode}
            onSelect={handleSelect}
            showHeaders={tone === 'all'}
          />
        </div>

        <div
          className="shrink-0 space-y-2 border-t bg-[var(--background)] px-8 pt-4"
          style={{
            borderColor: 'var(--border)',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
        >
          {purchaseControls ? (
            <div className="space-y-2.5">{purchaseControls}</div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 tracked transition hover:opacity-90"
              style={{background: 'var(--accent)', color: 'var(--background)'}}
            >
              Apply colour
            </button>
          )}
          <p className="text-[0.6rem] leading-snug text-muted-foreground">
            {SOLID_COLOUR_DISCLAIMER}
          </p>
        </div>
      </section>
    </>
  );

  /* -------------------------------- render ------------------------------ */

  return createPortal(
    <>
      {zoomOverlay}
      {browseOverlay}

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Colour studio — ${productName}`}
        aria-hidden={isOverlayOpen ? true : undefined}
        className={`studio-fade-in fixed inset-0 z-[200] flex h-[100dvh] flex-col overflow-hidden outline-none motion-reduce:transition-none ${
          isOverlayOpen ? 'invisible' : ''
        }`}
        style={{
          background: 'var(--background)',
          transform: entered ? 'translateY(0)' : 'translateY(8px)',
          opacity: entered ? 1 : 0,
        }}
      >
        <div aria-live="polite" className="sr-only">
          {selectedShade
            ? `Previewing ${selectedShade.family}, ${selectedShade.code}`
            : ''}
        </div>

        <header
          className="relative z-20 flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3 lg:px-8 lg:py-4"
          style={{
            borderColor: 'var(--border)',
            paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          }}
        >
          <div className="min-w-0">
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-muted-foreground">
              Colour studio
            </p>
            <h2 className="line-clamp-2 font-display text-lg leading-tight tracking-wide lg:text-2xl">
              {productName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close colour studio"
            className={iconBtn}
            style={{borderColor: 'var(--border)'}}
          >
            <X className="h-5 w-5" strokeWidth={1.25} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {isLgUp ? desktopBody : mobileMain}
        </div>
      </div>
    </>,
    document.body,
  );
}
