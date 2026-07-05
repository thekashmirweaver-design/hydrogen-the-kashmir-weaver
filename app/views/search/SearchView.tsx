import {Link, Form} from 'react-router';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {ProductTile} from '~/components/gulriza/ProductTile';
import {useCatalog} from '~/contexts/catalog-context';

export function SearchView({
  term,
  error,
}: {
  term: string;
  error?: string;
}) {
  const {products} = useCatalog();
  const trimmed = term.trim().toLowerCase();
  const results = trimmed
    ? products.filter((p) =>
        [p.name, p.collectionName, p.shortDescription, ...(p.tags ?? [])]
          .join(' ')
          .toLowerCase()
          .includes(trimmed),
      )
    : [];

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
          {results.length} result{results.length === 1 ? '' : 's'} for &ldquo;{term}&rdquo;
        </p>
      )}
      <div className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((product) => (
          <ProductTile key={product.handle} product={product} />
        ))}
      </div>
      {trimmed && results.length === 0 && !error && (
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
