import type {Shade} from '~/models/types';
import {ShadeSwatch} from '~/components/gulriza/ShadeSwatch';

function sampleShades(shades: Shade[], maxVisible: number): Shade[] {
  if (shades.length <= maxVisible) return shades;
  const last = maxVisible - 1;
  return Array.from({length: maxVisible}, (_, index) => {
    const pick = Math.round((index / last) * (shades.length - 1));
    return shades[pick]!;
  });
}

/** Overlapping colour circles for compact previews (e.g. PDP try-colours CTA). */
export function ShadeSwatchStack({
  shades,
  maxVisible = 4,
  size = 'sm',
  className = '',
}: {
  shades: Shade[];
  maxVisible?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const visible = sampleShades(shades, maxVisible);
  if (visible.length === 0) return null;

  return (
    <span
      className={`inline-flex items-center ${className}`}
      aria-hidden
    >
      {visible.map((shade, index) => (
        <span
          key={shade.code}
          className={`relative inline-flex ${index > 0 ? '-ml-2' : ''}`}
          style={{zIndex: visible.length - index}}
        >
          <ShadeSwatch
            hex={shade.hex}
            size={size}
            label={shade.family}
            className="border-background shadow-[0_0_0_1px_var(--hairline)]"
          />
        </span>
      ))}
    </span>
  );
}
