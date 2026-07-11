import {Link} from 'react-router';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import {ProductCatalog} from '~/components/gulriza/ProductCatalog';
import type {CatalogPageInfo, ProductListScope} from '~/lib/catalog-pagination';
import type {Product} from '~/models/types';

export function ShopView({
  products,
  pageInfo,
  listSource,
}: {
  products: Product[];
  pageInfo?: CatalogPageInfo;
  listSource?: ProductListScope;
}) {
  return (
    <div>
      <section className="mx-auto max-w-[1600px] px-6 pt-8 pb-12 md:px-10">
        <Reveal>
          <Eyebrow>Shop</Eyebrow>
          <h1
            className="font-display mt-6 text-4xl leading-[1.05] sm:text-5xl md:text-7xl"
            style={{fontWeight: 300}}
          >
            All pieces
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Every hand-woven pashmina in our atelier. Each piece is one of one — when it is gone, it
            is gone.
          </p>
        </Reveal>
      </section>

      <ProductCatalog
        products={products}
        pageInfo={pageInfo}
        listSource={listSource}
      />

      <section className="mx-auto max-w-[1600px] px-6 pb-24 md:px-10">
        <Hairline />
        <div className="mt-10 text-center">
          <Link to="/concierge" className="tracked inline-flex min-h-11 items-center justify-center text-muted-foreground hover:text-accent active:opacity-80">
            Looking for something specific? — Speak to a concierge
          </Link>
        </div>
      </section>
    </div>
  );
}
