import {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft, X} from 'lucide-react';
import type {Shade} from '~/models/types';
import {
  ColourStudioPreview,
  PreviewViewToggle,
} from '~/components/gulriza/ColourStudioPreview';
import {SelectedColourCard} from '~/components/gulriza/SelectedColourCard';
import {ShadeSwatchPicker} from '~/components/gulriza/ShadeSwatchPicker';
import {useFocusTrap} from '~/hooks/use-focus-trap';
import {useIsLgUp} from '~/hooks/use-is-lg-up';
import {prefetchRecolorAssets} from '~/hooks/use-recolor-assets';
import {
  SOLID_COLOUR_DISCLAIMER,
  SOLID_RECOLOR_IMAGE_SETS,
} from '~/lib/solid-product';
import {lockScroll, unlockScroll} from '~/lib/scroll-lock';

type MobileScreen = 'pick' | 'fullPreview';

function StudioFooter({
  onPreview,
  onApply,
  showPreviewButton,
  className = '',
}: {
  onPreview?: () => void;
  onApply: () => void;
  showPreviewButton?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`shrink-0 space-y-2 border-t bg-[var(--background)] pt-3 ${className}`}
      style={{
        borderColor: 'var(--border)',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex gap-2">
        {showPreviewButton && onPreview ? (
          <button
            type="button"
            onClick={onPreview}
            className="btn-secondary min-h-11 flex-1 py-3 tracked touch-manipulation"
          >
            Full preview
          </button>
        ) : null}
        <button
          type="button"
          onClick={onApply}
          className={`min-h-11 py-3 tracked transition hover:opacity-90 touch-manipulation active:opacity-90 ${
            showPreviewButton ? 'flex-[1.4]' : 'w-full'
          }`}
          style={{
            background: 'var(--accent)',
            color: 'var(--background)',
          }}
        >
          Apply colour
        </button>
      </div>
      <p className="text-[0.6rem] leading-snug text-muted-foreground">
        {SOLID_COLOUR_DISCLAIMER}
      </p>
    </div>
  );
}

export function TryColoursModal({
  open,
  onClose,
  productName,
  shades,
  selectedCode,
  onSelectShade,
  imageIdx,
  onImageIdxChange,
}: {
  open: boolean;
  onClose: () => void;
  productName: string;
  shades: Shade[];
  selectedCode: string;
  onSelectShade: (code: string) => void;
  imageIdx: number;
  onImageIdxChange: (idx: number) => void;
}) {
  const isLgUp = useIsLgUp();
  const dialogRef = useRef<HTMLDivElement>(null);
  const fullPreviewRef = useRef<HTMLDivElement>(null);
  const [mobileScreen, setMobileScreen] = useState<MobileScreen>('pick');
  const [entered, setEntered] = useState(false);

  const selectedShade =
    shades.find((s) => s.code === selectedCode) ?? shades[0] ?? null;
  const activeSet = SOLID_RECOLOR_IMAGE_SETS[imageIdx] ?? SOLID_RECOLOR_IMAGE_SETS[0]!;

  useFocusTrap(open && mobileScreen === 'pick', dialogRef);
  useFocusTrap(open && mobileScreen === 'fullPreview' && !isLgUp, fullPreviewRef);

  useEffect(() => {
    if (!open) return;
    setMobileScreen('pick');
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
    const hidden = open && !isLgUp && mobileScreen === 'fullPreview';
    if (hidden) {
      el.setAttribute('inert', '');
    } else {
      el.removeAttribute('inert');
    }
  }, [open, isLgUp, mobileScreen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isLgUp && mobileScreen === 'fullPreview') {
          setMobileScreen('pick');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, isLgUp, mobileScreen]);

  const handleSelectShade = useCallback(
    (code: string) => {
      onSelectShade(code);
    },
    [onSelectShade],
  );

  if (!open || typeof document === 'undefined') return null;

  const previewProps = {
    hex: selectedShade?.hex,
    imageSetId: activeSet.id,
    productName,
    imageLabel: activeSet.label,
  };

  const mobileFullPreview =
    !isLgUp && mobileScreen === 'fullPreview'
      ? createPortal(
          <div
            ref={fullPreviewRef}
            role="dialog"
            aria-modal="true"
            aria-label="Full colour preview"
            className="studio-slide-up fixed inset-0 z-[210] flex h-[100dvh] flex-col overflow-hidden bg-[var(--background)] motion-reduce:transition-none"
            style={{
              transform: entered ? 'translateY(0)' : 'translateY(100%)',
            }}
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
                onClick={() => setMobileScreen('pick')}
                aria-label="Back to colour picker"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition hover:text-accent"
                style={{borderColor: 'var(--border)'}}
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={1} />
              </button>
              <p className="font-display text-base tracking-wide">Full preview</p>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
              <ColourStudioPreview {...previewProps} size="full" />

              <div className="mt-4 space-y-4">
                <PreviewViewToggle
                  imageIdx={imageIdx}
                  onImageIdxChange={onImageIdxChange}
                  className="w-full"
                />
                {selectedShade ? (
                  <SelectedColourCard shade={selectedShade} />
                ) : null}
              </div>
            </div>

            <div className="shrink-0 space-y-2.5 border-t px-4 pt-3" style={{borderColor: 'var(--border)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'}}>
              <button
                type="button"
                onClick={() => setMobileScreen('pick')}
                className="btn-secondary w-full py-3.5 tracked touch-manipulation"
              >
                Change colour
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 tracked transition hover:opacity-90"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--background)',
                }}
              >
                Apply colour
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return createPortal(
    <>
      {mobileFullPreview}

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Try colours — ${productName}`}
        aria-hidden={!isLgUp && mobileScreen === 'fullPreview' ? true : undefined}
        className={`studio-fade-in fixed inset-0 z-[200] flex h-[100dvh] flex-col overflow-hidden outline-none motion-reduce:transition-none lg:bg-[rgba(8,16,15,0.97)] ${
          !isLgUp && mobileScreen === 'fullPreview' ? 'invisible' : ''
        }`}
        style={{
          background: 'var(--background)',
          transform: entered ? 'translateY(0)' : 'translateY(8px)',
          opacity: entered ? 1 : 0,
        }}
      >
        <div aria-live="polite" className="sr-only">
          {selectedShade
            ? `Previewing ${selectedShade.code} · ${selectedShade.family}`
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
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
                Colour studio
              </p>
              <span
                className="border px-1.5 py-0.5 text-[0.55rem] tracking-[0.14em] uppercase"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--muted-foreground)',
                }}
              >
                Beta
              </span>
            </div>
            <h2 className="truncate font-display text-lg tracking-wide lg:text-xl">
              {productName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition hover:text-accent"
            style={{borderColor: 'var(--border)'}}
          >
            <X className="h-5 w-5" strokeWidth={1} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Desktop / live preview column */}
          <section
            className="hidden min-h-0 flex-col border-r px-6 py-6 lg:flex lg:flex-1 lg:px-10 lg:py-8"
            style={{borderColor: 'var(--border)'}}
          >
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5">
              <ColourStudioPreview {...previewProps} size="desktop" />
              <PreviewViewToggle
                imageIdx={imageIdx}
                onImageIdxChange={onImageIdxChange}
              />
              {selectedShade ? (
                <div className="w-full max-w-lg">
                  <SelectedColourCard shade={selectedShade} />
                </div>
              ) : null}
            </div>
          </section>

          {/* Mobile pick + desktop picker column */}
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden lg:w-[min(100%,28rem)] lg:shrink-0">
            {/* Mobile: compact preview strip */}
            <div
              className="shrink-0 border-b px-4 py-2.5 lg:hidden"
              style={{borderColor: 'var(--border)'}}
            >
              <div className="flex items-stretch gap-3">
                {selectedShade ? (
                  <div className="min-w-0 flex-1">
                    <SelectedColourCard shade={selectedShade} compact />
                  </div>
                ) : null}
                <ColourStudioPreview
                  {...previewProps}
                  size="thumb"
                  onExpand={() => setMobileScreen('fullPreview')}
                />
              </div>
              <p className="mt-1 text-center text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase lg:hidden">
                Tap thumbnail for full preview
              </p>
              <PreviewViewToggle
                imageIdx={imageIdx}
                onImageIdxChange={onImageIdxChange}
                className="mt-2 w-full max-w-none"
              />
            </div>

            {/* Scrollable picker — single scroll region on mobile */}
            <div
              className={`min-h-0 flex-1 px-4 py-3 lg:flex lg:flex-col lg:overflow-hidden lg:px-6 lg:py-5 ${
                isLgUp ? '' : 'overflow-y-auto overscroll-contain'
              }`}
              style={isLgUp ? undefined : {WebkitOverflowScrolling: 'touch'}}
            >
              <div className="mb-3 shrink-0 lg:mb-4">
                <p className="eyebrow mb-1">Choose a colour</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Tap a swatch — the preview updates instantly.
                </p>
              </div>

              <ShadeSwatchPicker
                shades={shades}
                selectedCode={selectedCode}
                onSelect={handleSelectShade}
                showSelected={false}
                scrollSwatches={isLgUp}
                showCount={isLgUp}
                className={isLgUp ? 'min-h-0 flex-1' : ''}
              />
            </div>

            <StudioFooter
              className="px-4 lg:px-6"
              onApply={onClose}
              onPreview={() => setMobileScreen('fullPreview')}
              showPreviewButton={!isLgUp}
            />
          </section>
        </div>
      </div>
    </>,
    document.body,
  );
}
