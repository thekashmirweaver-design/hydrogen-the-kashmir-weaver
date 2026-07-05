import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import {CollectionStoryMobile} from '~/components/gulriza/CollectionStoryMobile';
import {
  COLLECTION_PRODUCTS_ID,
  CollectionProductsScrollCue,
} from '~/components/gulriza/CollectionProductsScrollCue';
import {ProductCatalog} from '~/components/gulriza/ProductCatalog';
import type {Collection, Product} from '~/models/types';

export function CollectionView({
  collection,
  products,
}: {
  collection: Collection;
  products: Product[];
}) {
  const nameParts = collection.name.split(' ');
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');

  return (
    <div>
      <section className="relative pt-[calc(var(--header-h)+1rem)]">
        <div className="relative aspect-[3/4] w-full overflow-hidden md:aspect-video">
          <img
            src={collection.hero.src}
            alt={collection.hero.alt}
            className="absolute inset-0 h-full w-full object-cover edge-fade-bottom"
            loading="eager"
          />
          <div className="absolute inset-0 vignette-overlay" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1600px] px-6 pb-10 md:px-10 md:pb-20">
            <Reveal>
              <Eyebrow>{collection.tagline}</Eyebrow>
              <h1
                className="font-display mt-4 text-4xl leading-[1.05] sm:text-5xl md:mt-6 md:text-7xl"
                style={{fontWeight: 300}}
              >
                {firstName}{' '}
                {restName ? (
                  <span style={{fontStyle: 'italic'}}>{restName}.</span>
                ) : null}
              </h1>
              <p className="mt-6 hidden max-w-xl text-base leading-relaxed text-muted-foreground md:block">
                {collection.story}
              </p>
            </Reveal>
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] px-6 pt-8 md:hidden">
          <Reveal>
            <CollectionStoryMobile text={collection.story} />
          </Reveal>
        </div>
      </section>

      <CollectionProductsScrollCue />

      <ProductCatalog
        id={COLLECTION_PRODUCTS_ID}
        products={products}
        filters={[]}
        emptyMessage="No pieces in this collection yet."
      />

      <section className="mx-auto max-w-[1600px] px-6 py-32 md:px-10">
        <Reveal className="text-center">
          <Eyebrow>The Collections</Eyebrow>
          <h2
            className="font-display mt-6 text-3xl leading-[1.1] md:text-5xl"
            style={{fontWeight: 400}}
          >
            Discover every collection
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground">
            From Sozni embroidery to Kani weave — explore every collection our atelier has to
            offer.
          </p>
          <Link
            to="/collections"
            className="tracked mt-10 inline-flex w-full items-center justify-center gap-3 px-10 py-4 font-medium transition hover:opacity-90 sm:w-auto"
            style={{background: 'var(--accent)', color: 'var(--background)'}}
          >
            All Collections <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
