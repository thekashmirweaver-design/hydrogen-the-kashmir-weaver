import {Link, Form} from 'react-router';
import {Loader2} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {ProductTile} from '~/components/gulriza/ProductTile';
import type {CatalogPageInfo} from '~/lib/catalog-pagination';
import type {Product} from '~/models/types';
import {useInfiniteSearchScroll} from '~/hooks/use-infinite-search-scroll';

export function SearchView({
  term,
  error,
  products: initialProducts,
  pageInfo,
}: {
  term: string;
  error?: string;
  products: Product[];
  pageInfo: CatalogPageInfo;
}) {
  const trimmed = term.trim();
  const {products, sentinelRef, isLoadingMore, hasMore} =
    useInfiniteSearchScroll({
      term,
      initialProducts,
      initialPageInfo: pageInfo,
    });

  return (
    <section className="mx-auto max-w-[1400px] px-6 pt-[calc(var(--header-h)+1.5rem)] pb-24 md:px-10">
      <Eyebrow>Search</Eyebrow>
      <h1
        className="font-display mt-6 text-4xl leading-tight md:text-6xl"
        style={{fontWeight: 400}}
      >
        Find your piece
      </h1>
      <Form method="get" className="mt-10 flex gap-3">
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Search pashmina, collections…"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          className="min-h-11 flex-1 border bg-transparent px-4 py-3 text-base focus:outline-none focus:border-accent"
          style={{borderColor: 'var(--border)'}}
        />
        <button
          type="submit"
          className="tracked min-h-11 px-6 py-3 transition hover:opacity-90 active:opacity-80"
          style={{background: 'var(--accent)', color: 'var(--background)'}}
        >
          Search
        </button>
      </Form>
      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}
      {trimmed && (
        <p className="mt-8 text-sm text-muted-foreground">
          {products.length} result{products.length === 1 ? '' : 's'} for
          &ldquo;{term}&rdquo;
        </p>
      )}
      <div className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductTile key={product.handle} product={product} />
        ))}
      </div>
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex justify-center py-12"
          aria-hidden
        >
          {isLoadingMore && (
            <Loader2
              className="h-6 w-6 animate-spin text-muted-foreground"
              strokeWidth={1.25}
              aria-label="Loading more results"
            />
          )}
        </div>
      )}
      {trimmed && products.length === 0 && !error && (
        <p className="mt-12 text-muted-foreground">
          No pieces matched.{' '}
          <Link to="/concierge" className="text-accent hover:underline">
            Speak to a concierge
          </Link>
        </p>
      )}
    </section>
  );
}
