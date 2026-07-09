import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {CollectionTile} from '~/components/gulriza/CollectionTile';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {ProductTile} from '~/components/gulriza/ProductTile';
import {Reveal} from '~/components/gulriza/Reveal';
import type {Collection, Product} from '~/models/types';

function collectionItemLayout(count: number, index: number) {
  const isLastOdd = count > 1 && count % 2 === 1 && index === count - 1;

  return {
    pair: count === 2,
    itemClass: isLastOdd ? 'sm:col-span-2 sm:flex sm:justify-center' : '',
    wrapperClass: isLastOdd ? 'w-full sm:w-[calc(50%-1rem)]' : 'w-full',
  };
}

export function CollectionsView({
  collections,
  productCountByHandle,
  previewProductsByHandle,
  totalProductCount,
  featuredProducts,
}: {
  collections: Collection[];
  productCountByHandle: Record<string, number>;
  previewProductsByHandle: Record<string, Product[]>;
  totalProductCount: number;
  featuredProducts: Product[];
}) {
  const count = collections.length;
  const showInventorySection = count <= 2 && featuredProducts.length > 0;

  return (
    <div>
      <section className="mx-auto max-w-[1600px] px-6 pt-8 pb-12 md:px-10">
        <Reveal>
          <Eyebrow>The Collections</Eyebrow>
          <h1
            className="font-display mt-6 text-4xl leading-[1.05] sm:text-5xl md:text-7xl"
            style={{fontWeight: 300}}
          >
            A house of
            <br />
            <span style={{fontStyle: 'italic'}}>quiet luxury.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            {count === 1
              ? 'One signature collection — hand-woven, hand-finished, never repeated.'
              : `${count} signature collections. Each a different language of the same fibre — hand-woven, hand-finished, never repeated.`}
            {totalProductCount > 0 && (
              <>
                {' '}
                <span className="text-foreground/80">
                  {totalProductCount} {totalProductCount === 1 ? 'piece' : 'pieces'} in the
                  atelier.
                </span>
              </>
            )}
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[1600px] px-6 py-12 md:px-10">
        <Hairline />

        {count === 1 ? (
          <Reveal className="mt-10">
            <CollectionTile
              collection={collections[0]}
              productCount={productCountByHandle[collections[0].handle]}
              previewProducts={previewProductsByHandle[collections[0].handle]}
              featured
            />
          </Reveal>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {collections.map((c, i) => {
              const layout = collectionItemLayout(count, i);
              return (
                <Reveal key={c.handle} delay={i * 120} className={layout.itemClass}>
                  <div className={layout.wrapperClass}>
                    <CollectionTile
                      collection={c}
                      productCount={productCountByHandle[c.handle]}
                      previewProducts={previewProductsByHandle[c.handle]}
                      pair={layout.pair}
                    />
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}

        {showInventorySection && (
          <>
            <Hairline className="mt-24" />
            <Reveal className="mt-20">
              <Eyebrow>The Atelier</Eyebrow>
              <h2
                className="font-display mt-4 text-3xl md:text-5xl"
                style={{fontWeight: 400}}
              >
                From the loom
              </h2>
              <p className="mt-4 max-w-xl text-base text-muted-foreground">
                A selection of hand-woven pieces currently in our atelier.
              </p>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 md:gap-x-8 lg:grid-cols-3">
              {featuredProducts.map((p, i) => (
                <Reveal key={p.handle} delay={i * 100}>
                  <ProductTile product={p} />
                </Reveal>
              ))}
            </div>
          </>
        )}

        <Hairline className="mt-24" />
        <Reveal className="mt-28 text-center">
          <Link
            to="/collections/all"
            className="tracked inline-flex w-full items-center justify-center gap-3 px-10 py-4 font-medium transition hover:opacity-90 sm:w-auto"
            style={{background: 'var(--accent)', color: 'var(--background)'}}
          >
            Shop All Pieces <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
