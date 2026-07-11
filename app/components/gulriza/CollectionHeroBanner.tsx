import type {ReactNode} from 'react';
import {EditorialImage} from '~/components/gulriza/CatalogImage';
import type {ProductImage} from '~/models/types';

/** Full-bleed collection hero — 4:5 portrait on mobile, natural aspect on desktop. */
export function CollectionHeroBanner({
  hero,
  children,
  priority = false,
  /** Soft Ken Burns zoom on hover (home signature cards, etc.). */
  zoomOnHover = false,
}: {
  hero: ProductImage;
  children?: ReactNode;
  priority?: boolean;
  zoomOnHover?: boolean;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden ${zoomOnHover ? 'group' : ''}`}
      style={{background: 'var(--surface)'}}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden md:aspect-auto">
        <EditorialImage
          src={hero.src}
          alt={hero.alt}
          width={hero.width}
          height={hero.height}
          wrapperClassName={
            zoomOnHover
              ? 'absolute inset-0 h-full w-full origin-center will-change-transform transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 md:static md:h-auto md:min-h-0'
              : undefined
          }
          className={
            zoomOnHover
              ? 'h-full w-full object-cover object-top md:h-auto md:w-full'
              : 'absolute inset-0 h-full w-full object-cover object-top md:static md:h-auto md:w-full'
          }
          sizes="100vw"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          priority={priority}
        />
      </div>
      <div className="vignette-overlay pointer-events-none absolute inset-0" />
      {/* Bottom scrim — warm in light theme, forest in dark */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgb(var(--photo-scrim-rgb) / 0.92) 0%, rgb(var(--photo-scrim-rgb) / 0.55) 38%, rgb(var(--photo-scrim-rgb) / 0.18) 62%, transparent 78%)',
        }}
      />
      {children ? (
        <div className="on-photo pointer-events-none absolute inset-0 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          {children}
        </div>
      ) : null}
    </div>
  );
}
