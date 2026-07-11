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
import {CollectionHeroBanner} from '~/components/gulriza/CollectionHeroBanner';
import {TrustStrip} from '~/components/gulriza/TrustStrip';
import type {CatalogPageInfo, ProductListScope} from '~/lib/catalog-pagination';
import type {Collection, Product} from '~/models/types';

export function CollectionView({
  collection,
  products,
  pageInfo,
  listSource,
}: {
  collection: Collection;
  products: Product[];
  pageInfo?: CatalogPageInfo;
  listSource?: ProductListScope;
}) {
  const nameParts = collection.name.split(' ');
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');

  return (
    <div>
      <section className="relative">
        <CollectionHeroBanner hero={collection.hero} priority>
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1600px] px-6 pb-10 md:px-10 md:pb-20">
            <Reveal>
              <Eyebrow>{collection.tagline}</Eyebrow>
              <h1
                className="font-display mt-4 text-4xl leading-[1.05] text-[var(--on-photo-fg)] sm:text-5xl md:mt-6 md:text-7xl"
                style={{fontWeight: 300}}
              >
                {firstName}{' '}
                {restName ? (
                  <span style={{fontStyle: 'italic'}}>{restName}.</span>
                ) : null}
              </h1>
              <p className="mt-6 hidden max-w-xl text-base leading-relaxed text-[var(--on-photo-muted)] md:block">
                {collection.story}
              </p>
            </Reveal>
          </div>
        </CollectionHeroBanner>
      </section>

      <TrustStrip compact />

      <CollectionProductsScrollCue />

      <ProductCatalog
        id={COLLECTION_PRODUCTS_ID}
        products={products}
        pageInfo={pageInfo}
        listSource={listSource}
        filters={['price']}
        emptyMessage="No pieces in this collection yet."
      />

      {/* Mobile story after products — shop first, read second */}
      <section className="mx-auto max-w-[1600px] px-6 py-12 md:hidden">
        <Reveal>
          <Eyebrow>About this collection</Eyebrow>
          <div className="mt-4">
            <CollectionStoryMobile text={collection.story} />
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[1600px] px-6 py-24 md:px-10 md:py-32">
        <Reveal className="text-center">
          <Eyebrow>Shop</Eyebrow>
          <h2
            className="font-display mt-6 text-3xl leading-[1.1] md:text-5xl"
            style={{fontWeight: 400}}
          >
            Looking for something else?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground">
            Browse every hand-woven piece currently in our atelier.
          </p>
          <Link
            to="/collections/all"
            className="tracked mt-10 inline-flex w-full items-center justify-center gap-3 px-10 py-4 font-medium transition hover:opacity-90 sm:w-auto"
            style={{background: 'var(--accent)', color: 'var(--background)'}}
          >
            Shop all pieces <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
