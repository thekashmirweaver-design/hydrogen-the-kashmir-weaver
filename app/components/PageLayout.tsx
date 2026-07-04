import {Await, Link, useLocation, useNavigation} from 'react-router';
import {Suspense, type ReactNode} from 'react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CatalogSnapshot} from '~/models/types';
import type {ShopSettings} from '~/lib/shop-settings';
import type {LocalizationSnapshot} from '~/lib/localization';
import {CatalogProvider} from '~/contexts/catalog-context';
import {LocalizationProvider} from '~/contexts/localization-context';
import {SiteHeader} from '~/components/gulriza/SiteHeader';
import {SiteFooter} from '~/components/gulriza/SiteFooter';
import {ScrollToTop} from '~/components/gulriza/ScrollToTop';
import {CartFab} from '~/components/gulriza/CartFab';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  catalog: CatalogSnapshot;
  shopSettings: ShopSettings;
  localization: LocalizationSnapshot;
  publicStoreDomain: string;
  publicAccessToken: string;
  customerAccessToken: Promise<string | null>;
  children?: React.ReactNode;
}

function MarketAwareMain({children}: {children: ReactNode}) {
  const navigation = useNavigation();
  const location = useLocation();
  const isMarketReload =
    navigation.state !== 'idle' &&
    navigation.location?.search !== location.search;

  return (
    <main
      className="transition-opacity duration-150 ease-out"
      style={{opacity: isMarketReload ? 0.55 : 1}}
    >
      {children}
    </main>
  );
}

export function PageLayout({
  cart,
  catalog,
  shopSettings,
  localization,
  publicStoreDomain,
  publicAccessToken,
  customerAccessToken,
  children = null,
}: PageLayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const session = Promise.all([cart, customerAccessToken]);

  return (
    <CatalogProvider catalog={catalog}>
      <LocalizationProvider localization={localization}>
      <ScrollToTop />
      <Suspense
        fallback={
          <>
            <SiteHeader
              transparent={isHome}
              cart={null}
              cartQuantity={0}
              shopSettings={shopSettings}
              publicStoreDomain={publicStoreDomain}
              publicAccessToken={publicAccessToken}
              customerAccessToken={null}
            />
            <main>{children}</main>
            <SiteFooter shopSettings={shopSettings} />
          </>
        }
      >
        <Await resolve={session}>
          {([resolvedCart, resolvedCustomerAccessToken]) => (
            <>
              <SiteHeader
                transparent={isHome}
                cart={resolvedCart}
                cartQuantity={resolvedCart?.totalQuantity ?? 0}
                shopSettings={shopSettings}
                publicStoreDomain={publicStoreDomain}
                publicAccessToken={publicAccessToken}
                customerAccessToken={resolvedCustomerAccessToken}
              />
              <MarketAwareMain>{children}</MarketAwareMain>
              <CartFab cartQuantity={resolvedCart?.totalQuantity ?? 0} />
              <SiteFooter shopSettings={shopSettings} />
            </>
          )}
        </Await>
      </Suspense>
      </LocalizationProvider>
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
