import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {CatalogImage, EditorialImage} from '~/components/gulriza/CatalogImage';
import type {Collection, Product} from '~/models/types';

type CollectionTileProps = {
  collection: Collection;
  productCount?: number;
  previewProducts?: Product[];
  featured?: boolean;
  /** Two-up row: slightly taller tile so the pair fills the viewport confidently. */
  pair?: boolean;
};

function CollectionName({name, large}: {name: string; large?: boolean}) {
  const parts = name.split(' ');
  const first = parts[0];
  const rest = parts.slice(1).join(' ');
  return (
    <h2
      className={
        large
          ? 'font-display text-3xl leading-[1.05] sm:text-4xl md:text-5xl'
          : 'font-display text-2xl leading-tight md:text-3xl'
      }
      style={{fontWeight: 400}}
    >
      {first} {rest ? <span style={{fontStyle: 'italic'}}>{rest}</span> : null}
    </h2>
  );
}

function InventoryRow({
  productCount,
  previewProducts,
  featured,
}: {
  productCount?: number;
  previewProducts: Product[];
  featured?: boolean;
}) {
  if (!productCount && previewProducts.length === 0) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-4">
      {productCount != null && productCount > 0 && (
        <span
          className={
            featured
              ? 'rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-[0.65rem] tracking-[0.2em] uppercase text-accent'
              : 'text-[0.65rem] tracking-[0.2em] uppercase text-[var(--on-photo-muted)]'
          }
        >
          {productCount} {productCount === 1 ? 'piece' : 'pieces'}
        </span>
      )}
      {previewProducts.length > 0 && (
        <div className="flex items-center gap-2">
          {previewProducts.map((p) => (
            <div
              key={p.handle}
              className={
                featured
                  ? 'h-14 w-11 overflow-hidden border'
                  : 'h-10 w-8 overflow-hidden border'
              }
              style={{borderColor: 'var(--hairline-strong)', background: 'var(--surface)'}}
            >
              {p.images[0] && (
                <CatalogImage
                  image={p.images[0]}
                  className="h-full w-full object-cover"
                  sizes="44px"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExploreCta({featured}: {featured?: boolean}) {
  return (
    <div
      className={
        featured
          ? 'mt-8 flex w-max items-center gap-3 rounded-full border border-accent/40 bg-accent/5 px-5 py-2.5 text-[0.65rem] tracking-widest text-accent uppercase font-medium transition-all duration-300 md:text-xs group-hover:bg-accent/10'
          : 'mt-6 flex w-max items-center gap-3 rounded-full border border-white/25 bg-black/30 px-5 py-2.5 text-[0.65rem] tracking-widest text-[var(--on-photo-accent)] uppercase font-medium transition-all duration-300 md:border-transparent md:bg-transparent md:px-0 md:py-0 md:text-xs md:opacity-0 md:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
      }
    >
      Explore Collection <ArrowRight className="h-3.5 w-3.5" />
    </div>
  );
}

function ImageScrim() {
  return (
    <>
      <div className="vignette-overlay pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            `linear-gradient(to right, var(--image-scrim-strong) 0%, var(--image-scrim-medium) 45%, transparent 70%), linear-gradient(to top, var(--image-scrim-strong) 0%, var(--image-scrim-medium) 40%, transparent 65%)`,
        }}
      />
    </>
  );
}

export function CollectionTile({
  collection,
  productCount,
  previewProducts = [],
  featured = false,
  pair = false,
}: CollectionTileProps) {
  if (featured) {
    return (
      <Link
        to={`/collections/${collection.handle}`}
        prefetch="intent"
        className="group relative block w-full overflow-hidden"
        style={{background: 'var(--surface)'}}
      >
        <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,40%)_1fr] md:aspect-[16/10]">
          <div
            className="relative order-2 flex flex-col justify-center p-8 md:order-1 md:p-10 lg:p-12"
            style={{background: 'var(--surface)'}}
          >
            <Eyebrow>{collection.tagline}</Eyebrow>
            <div className="mt-4">
              <CollectionName name={collection.name} large />
            </div>
            <InventoryRow
              productCount={productCount}
              previewProducts={previewProducts}
              featured
            />
            <ExploreCta featured />
          </div>

          <div className="relative order-1 aspect-[4/3] overflow-hidden md:order-2 md:aspect-auto md:min-h-0">
            <EditorialImage
              src={collection.hero.src}
              alt={collection.hero.alt}
              wrapperClassName="absolute inset-0 h-full w-full origin-center will-change-transform transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              className="h-full w-full object-cover"
              sizes="(min-width: 768px) 60vw, 100vw"
            />
            <div className="vignette-overlay pointer-events-none absolute inset-0 hidden md:block" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/collections/${collection.handle}`}
      prefetch="intent"
      className="group relative block w-full overflow-hidden"
      style={{background: 'var(--surface)'}}
    >
      <div
        className={
          pair
            ? 'relative aspect-[3/4] w-full sm:aspect-[4/5]'
            : 'relative aspect-[3/4] w-full'
        }
      >
        <EditorialImage
          src={collection.hero.src}
          alt={collection.hero.alt}
          wrapperClassName="absolute inset-0 h-full w-full origin-center will-change-transform transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          className="h-full w-full object-cover"
          sizes="(min-width: 640px) 50vw, 100vw"
        />
        <ImageScrim />

        <div className="on-photo absolute inset-x-0 bottom-0 p-8">
          <Eyebrow>{collection.tagline}</Eyebrow>
          <div className="mt-4">
            <CollectionName name={collection.name} />
          </div>
          <InventoryRow productCount={productCount} previewProducts={previewProducts} />
          <ExploreCta />
        </div>
      </div>
    </Link>
  );
}
