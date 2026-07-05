import {Await, Link, useLocation, useNavigation} from 'react-router';
import {Suspense, useMemo, type ReactNode} from 'react';
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
import {useLiveCart} from '~/lib/use-live-cart';

const EMPTY_CATALOG: CatalogSnapshot = {products: [], collections: []};

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  catalog: Promise<CatalogSnapshot>;
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
  const layoutSession = useMemo(
    () => Promise.all([catalog, cart, customerAccessToken]),
    [catalog, cart, customerAccessToken],
  );

  return (
    <LocalizationProvider localization={localization}>
      <ScrollToTop />
      <Suspense
        fallback={
          <CatalogProvider catalog={EMPTY_CATALOG}>
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
              <main aria-busy="true" />
              <SiteFooter shopSettings={shopSettings} />
            </>
          </CatalogProvider>
        }
      >
        <Await resolve={layoutSession}>
          {([resolvedCatalog, resolvedCart, resolvedCustomerAccessToken]) => (
            <CatalogProvider catalog={resolvedCatalog}>
              <CartAwareChrome
                isHome={isHome}
                resolvedCart={resolvedCart}
                resolvedCustomerAccessToken={resolvedCustomerAccessToken}
                shopSettings={shopSettings}
                publicStoreDomain={publicStoreDomain}
                publicAccessToken={publicAccessToken}
              >
                {children}
              </CartAwareChrome>
            </CatalogProvider>
          )}
        </Await>
      </Suspense>
    </LocalizationProvider>
  );
}

function CartAwareChrome({
  isHome,
  resolvedCart,
  resolvedCustomerAccessToken,
  shopSettings,
  publicStoreDomain,
  publicAccessToken,
  children,
}: {
  isHome: boolean;
  resolvedCart: CartApiQueryFragment | null;
  resolvedCustomerAccessToken: string | null;
  shopSettings: ShopSettings;
  publicStoreDomain: string;
  publicAccessToken: string;
  children?: React.ReactNode;
}) {
  const cart = useLiveCart(resolvedCart);
  const cartQuantity = cart?.totalQuantity ?? 0;

  return (
    <>
      <SiteHeader
        transparent={isHome}
        cart={cart}
        cartQuantity={cartQuantity}
        shopSettings={shopSettings}
        publicStoreDomain={publicStoreDomain}
        publicAccessToken={publicAccessToken}
        customerAccessToken={resolvedCustomerAccessToken}
      />
      <MarketAwareMain>{children}</MarketAwareMain>
      <CartFab cartQuantity={cartQuantity} />
      <SiteFooter shopSettings={shopSettings} />
    </>
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
