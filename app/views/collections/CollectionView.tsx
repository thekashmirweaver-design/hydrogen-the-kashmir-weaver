import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import {ProductCatalog} from '~/components/gulriza/ProductCatalog';
import type {Collection, Product} from '~/models/types';

export function CollectionView({
  collection,
  products,
}: {
  collection: Collection;
  products: Product[];
}) {
  return (
    <div>
      <section className="relative pt-20">
        <div className="relative h-[60vh] w-full overflow-hidden md:h-[80vh]">
          <img
            src={collection.hero.src}
            alt={collection.hero.alt}
            className="absolute inset-0 h-full w-full object-cover edge-fade-bottom"
            loading="eager"
          />
          <div className="absolute inset-0 vignette-overlay" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1600px] px-6 pb-12 md:px-10 md:pb-20">
            <Reveal>
              <Eyebrow>{collection.tagline}</Eyebrow>
              <h1
                className="font-display mt-6 text-4xl leading-[1.05] sm:text-5xl md:text-7xl"
                style={{fontWeight: 300}}
              >
                {collection.name.split(' ')[0]}{' '}
                <span style={{fontStyle: 'italic'}}>
                  {collection.name.split(' ').slice(1).join(' ')}.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
                {collection.story}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <ProductCatalog products={products} filters={[]} />

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
