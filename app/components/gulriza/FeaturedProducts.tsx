import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import type {Product} from '~/models/types';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import {ProductCarousel} from '~/components/gulriza/ProductCarousel';

/**
 * Reusable "Featured Pieces" carousel — same component used on the homepage
 * and at the bottom of every journal article page.
 */
export function FeaturedProducts({products}: {products: Product[]}) {
  if (!products.length) return null;
  return (
    <section className="relative py-20 md:py-32" data-component="featured-products">
      <div className="mx-auto max-w-[1600px] px-6 md:px-10">
        <Reveal className="mb-12 flex items-end justify-between">
          <div>
            <Eyebrow>The Atelier</Eyebrow>
            <h2 className="font-display mt-4 text-3xl md:text-5xl" style={{fontWeight: 400}}>
              Featured Pieces
            </h2>
          </div>
          <Link
            to="/collections/all"
            className="tracked hidden items-center gap-3 px-6 py-3 font-medium transition hover:opacity-90 md:inline-flex"
            style={{background: 'var(--accent)', color: 'var(--background)'}}
          >
            View All Pieces <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Reveal>
        <ProductCarousel products={products} />
        <Reveal className="mt-12 text-center md:hidden">
          <Link
            to="/collections/all"
            className="tracked inline-flex w-full items-center justify-center gap-3 px-10 py-4 font-medium transition hover:opacity-90 sm:w-auto"
            style={{background: 'var(--accent)', color: 'var(--background)'}}
          >
            View All Pieces <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}