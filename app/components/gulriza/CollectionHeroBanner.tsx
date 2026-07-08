import type {ReactNode} from 'react';
import {EditorialImage} from '~/components/gulriza/CatalogImage';
import type {ProductImage} from '~/models/types';

/** Full-bleed collection hero — 4:5 portrait on mobile, natural aspect on desktop. */
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
      <div className="relative aspect-[4/5] w-full overflow-hidden md:aspect-auto">
        <EditorialImage
          src={hero.src}
          alt={hero.alt}
          width={hero.width}
          height={hero.height}
          className="absolute inset-0 h-full w-full object-cover object-top md:static md:h-auto md:w-full"
          sizes="100vw"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
        />
      </div>
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
