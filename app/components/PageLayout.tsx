import {Await, Link, useLocation} from 'react-router';
import {Suspense} from 'react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CatalogSnapshot} from '~/models/types';
import {CatalogProvider} from '~/contexts/catalog-context';
import {SiteHeader} from '~/components/gulriza/SiteHeader';
import {SiteFooter} from '~/components/gulriza/SiteFooter';
import {ScrollToTop} from '~/components/gulriza/ScrollToTop';
import {CartFab} from '~/components/gulriza/CartFab';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  catalog: CatalogSnapshot;
  children?: React.ReactNode;
}

export function PageLayout({cart, catalog, children = null}: PageLayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <CatalogProvider catalog={catalog}>
      <ScrollToTop />
      <Suspense
        fallback={
          <>
            <SiteHeader transparent={isHome} cart={null} cartQuantity={0} />
            <main>{children}</main>
            <SiteFooter />
          </>
        }
      >
        <Await resolve={cart}>
          {(resolvedCart) => (
            <>
              <SiteHeader
                transparent={isHome}
                cart={resolvedCart}
                cartQuantity={resolvedCart?.totalQuantity ?? 0}
              />
              <main>{children}</main>
              <CartFab cartQuantity={resolvedCart?.totalQuantity ?? 0} />
              <SiteFooter />
            </>
          )}
        </Await>
      </Suspense>
    </CatalogProvider>
  );
}

export function NotFoundView() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[1100px] flex-col items-center justify-center px-6 py-32 text-center md:px-10">
      <p className="eyebrow">404</p>
      <h1
        className="font-display mt-8 text-5xl leading-[1.05] md:text-[5rem]"
        style={{fontWeight: 300}}
      >
        This path has
        <br />
        <span style={{fontStyle: 'italic'}}>no weave.</span>
      </h1>
      <p className="mt-8 max-w-md text-muted-foreground">
        The page you sought is not in our archive. Return to the atelier.
      </p>
      <div className="mt-12 flex flex-wrap justify-center gap-4">
        <Link
          to="/"
          className="tracked border px-8 py-4 transition hover:opacity-90"
          style={{
            background: 'var(--accent)',
            color: 'var(--background)',
            borderColor: 'var(--accent)',
          }}
        >
          Home
        </Link>
        <Link
          to="/collections"
          className="tracked border px-8 py-4 transition hover:text-accent"
          style={{borderColor: 'var(--border)'}}
        >
          Collections
        </Link>
      </div>
    </div>
  );
}
