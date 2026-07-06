import brandMark from '~/assets/brand-mark.png';

/**
 * Two-line brand lockup. Sizing/tracking come from `className` so header,
 * footer, and menu can share one markup — fine serif type, generous tracking,
 * muted gold second line.
 */
export function BrandLockup({className = ''}: {className?: string}) {
  return (
    <span
      className={`font-display flex flex-col uppercase leading-[1.15] font-semibold ${className}`}
    >
      <span className="whitespace-nowrap">The Kashmir</span>
      <span
        className="mt-0.5 whitespace-nowrap text-[0.72em] font-semibold not-italic tracking-[0.42em] opacity-95 transition-opacity duration-500 group-hover:opacity-100"
        style={{color: 'var(--accent)'}}
      >
        Weaver
      </span>
    </span>
  );
}

/** Loom-knot emblem — sized via `className`. */
export function BrandMark({className = ''}: {className?: string}) {
  return (
    <img
      src={brandMark}
      alt=""
      aria-hidden
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
