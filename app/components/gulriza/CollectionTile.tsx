import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
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
              : 'text-[0.65rem] tracking-[0.2em] uppercase text-foreground/80'
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
                  ? 'h-14 w-11 overflow-hidden border border-white/15'
                  : 'h-10 w-8 overflow-hidden border border-white/20'
              }
              style={{background: 'var(--surface)'}}
            >
              {p.images[0] && (
                <img
                  src={p.images[0].src}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
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
          : 'mt-6 flex w-max items-center gap-3 rounded-full border border-accent/40 bg-accent/5 px-5 py-2.5 text-[0.65rem] md:text-xs tracking-widest text-accent uppercase font-medium transition-all duration-300 md:border-transparent md:bg-transparent md:px-0 md:py-0 md:opacity-0 md:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
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
            'linear-gradient(to right, rgba(8,16,15,0.88) 0%, rgba(8,16,15,0.35) 45%, transparent 70%), linear-gradient(to top, rgba(8,16,15,0.95) 0%, rgba(8,16,15,0.4) 40%, transparent 65%)',
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
            <img
              src={collection.hero.src}
              alt={collection.hero.alt}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-105"
              loading="lazy"
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
        <img
          src={collection.hero.src}
          alt={collection.hero.alt}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-105"
          loading="lazy"
        />
        <ImageScrim />

        <div className="absolute inset-x-0 bottom-0 p-8">
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
