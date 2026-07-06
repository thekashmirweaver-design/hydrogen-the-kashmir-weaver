import {SolidRecolorCanvas} from '~/components/gulriza/SolidRecolorCanvas';
import {SOLID_RECOLOR_IMAGE_SETS} from '~/lib/solid-product';

const SIZE_CLASS = {
  thumb: 'relative h-20 w-20 shrink-0',
  mini: 'relative mx-auto h-[min(22dvh,9rem)] w-full max-w-[9rem]',
  stage: 'relative mx-auto h-full min-h-[9rem] w-full max-w-[15rem]',
  hero: 'relative mx-auto h-[min(42dvh,400px)] min-h-[12rem] w-full max-w-sm',
  full: 'relative mx-auto h-[min(68dvh,720px)] min-h-[18rem] w-full max-w-md',
  desktop:
    'relative mx-auto aspect-[4/5] w-full max-w-lg lg:min-h-[20rem] lg:max-h-[calc(100dvh-14rem)] xl:max-w-xl',
} as const;

export function PreviewViewToggle({
  imageIdx,
  onImageIdxChange,
  className = '',
}: {
  imageIdx: number;
  onImageIdxChange: (idx: number) => void;
  className?: string;
}) {
  if (SOLID_RECOLOR_IMAGE_SETS.length <= 1) return null;

  return (
    <div
      className={`inline-flex w-full max-w-sm border p-0.5 ${className}`}
      role="tablist"
      aria-label="Preview view"
      style={{borderColor: 'var(--border)'}}
    >
      {SOLID_RECOLOR_IMAGE_SETS.map((set, i) => {
        const active = i === imageIdx;
        return (
          <button
            key={set.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onImageIdxChange(i)}
            className="min-h-11 flex-1 px-3 text-[0.65rem] tracking-[0.16em] uppercase transition touch-manipulation active:opacity-90"
            style={{
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--background)' : 'var(--muted-foreground)',
            }}
          >
            {set.label}
          </button>
        );
      })}
    </div>
  );
}

export function ColourStudioPreview({
  hex,
  imageSetId,
  productName,
  imageLabel,
  size,
  onExpand,
  className = '',
}: {
  hex?: string | null;
  imageSetId: string;
  productName: string;
  imageLabel: string;
  size: keyof typeof SIZE_CLASS;
  onExpand?: () => void;
  className?: string;
}) {
  const inner = (
    <div className={`${SIZE_CLASS[size]} ${className}`} style={{background: 'var(--surface)'}}>
      <SolidRecolorCanvas
        hex={hex}
        imageSetId={imageSetId}
        fit="contain"
        alt={`${productName} — ${imageLabel}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );

  if (onExpand) {
    const isThumb = size === 'thumb';
    return (
      <button
        type="button"
        onClick={onExpand}
        aria-label="Open full preview"
        className={
          isThumb
            ? 'shrink-0 overflow-hidden rounded-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] touch-manipulation active:scale-[0.98]'
            : 'mx-auto flex w-full max-w-sm flex-col items-center gap-1 rounded-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]'
        }
      >
        {inner}
        {!isThumb ? (
          <span className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
            Tap for full preview
          </span>
        ) : null}
      </button>
    );
  }

  return <div className="flex w-full justify-center">{inner}</div>;
}
