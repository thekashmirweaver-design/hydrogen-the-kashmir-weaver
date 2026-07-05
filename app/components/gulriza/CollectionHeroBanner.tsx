import type {ReactNode} from 'react';
import {EditorialImage} from '~/components/gulriza/CatalogImage';
import type {ProductImage} from '~/models/types';

/** Full-bleed collection hero — full width, natural aspect, no object-cover crop. */
export function CollectionHeroBanner({
  hero,
  children,
  priority = false,
}: {
  hero: ProductImage;
  children?: ReactNode;
  priority?: boolean;
}) {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{background: 'var(--surface)'}}
    >
      <EditorialImage
        src={hero.src}
        alt={hero.alt}
        width={hero.width}
        height={hero.height}
        className="block h-auto w-full"
        sizes="100vw"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
      />
      <div className="vignette-overlay pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0 hidden md:block"
        style={{
          background:
            'linear-gradient(to top, rgba(8,16,15,0.95) 0%, rgba(8,16,15,0.35) 45%, transparent 70%)',
        }}
      />
      {children}
    </div>
  );
}
