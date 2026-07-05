const SIZES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-11 w-11',
} as const;

/** Circular colour preview swatch. */
export function ShadeSwatch({
  hex,
  size = 'md',
  className = '',
  label,
}: {
  hex: string;
  size?: keyof typeof SIZES;
  className?: string;
  /** Accessible name when used without visible text. */
  label?: string;
}) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block shrink-0 rounded-full border border-white shadow-[0_0_0_1px_var(--border)] ${SIZES[size]} ${className}`}
      style={{backgroundColor: hex}}
    />
  );
}
