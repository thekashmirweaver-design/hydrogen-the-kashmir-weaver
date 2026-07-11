import {
  Award,
  BadgeCheck,
  Hand,
  Truck,
  type LucideIcon,
} from 'lucide-react';

const TRUST_CLAIMS: ReadonlyArray<{
  label: string;
  /** One-line mobile label — keep short so 4 fit in one row. */
  microLabel: string;
  Icon: LucideIcon;
}> = [
  {
    label: 'Authentic Kashmiri pashmina',
    microLabel: 'Authentic',
    Icon: BadgeCheck,
  },
  {
    label: 'Certificate of authenticity',
    microLabel: 'Certificate',
    Icon: Award,
  },
  {
    label: 'Free shipping over $200',
    microLabel: 'Ship $200+',
    Icon: Truck,
  },
  {
    label: 'Handcrafted by artisans',
    microLabel: 'Handcrafted',
    Icon: Hand,
  },
];

/**
 * Compact trust row for homepage + collection surfaces.
 * Mobile: one non-scrolling row of 4 (icons + micro labels) to avoid height or swipe.
 */
export function TrustStrip({compact = false}: {compact?: boolean} = {}) {
  return (
    <section
      className="border-y"
      style={{borderColor: 'var(--border)', background: 'var(--surface)'}}
      aria-label="Why shop with us"
    >
      {/* Mobile: single fixed row — no scroll, no 2×2 height */}
      <ul
        className={`grid grid-cols-4 gap-1 px-3 md:hidden ${
          compact ? 'py-3' : 'py-3.5'
        }`}
      >
        {TRUST_CLAIMS.map(({label, microLabel, Icon}) => (
          <li key={label} className="min-w-0 text-center" title={label}>
            <span
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
              }}
              aria-hidden
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.25} />
            </span>
            <p className="mt-1.5 text-[0.625rem] leading-tight text-foreground/85">
              {microLabel}
            </p>
            <span className="sr-only">{label}</span>
          </li>
        ))}
      </ul>

      {/* Desktop / tablet: fuller labels */}
      <ul
        className={`mx-auto hidden max-w-[1600px] grid-cols-4 md:grid ${
          compact
            ? 'gap-8 px-10 py-6 lg:gap-10'
            : 'gap-10 px-10 py-9 lg:gap-12'
        }`}
      >
        {TRUST_CLAIMS.map(({label, Icon}) => (
          <li key={label} className="flex items-start gap-4">
            <span
              className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full ${
                compact ? 'h-9 w-9' : 'h-11 w-11'
              }`}
              style={{
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
              }}
              aria-hidden
            >
              <Icon
                className={compact ? 'h-4 w-4' : 'h-[1.125rem] w-[1.125rem]'}
                strokeWidth={1.25}
              />
            </span>
            <p
              className={`leading-snug text-foreground/85 ${
                compact ? 'pt-1.5 text-[0.8125rem]' : 'pt-2.5 text-sm'
              }`}
            >
              {label}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
