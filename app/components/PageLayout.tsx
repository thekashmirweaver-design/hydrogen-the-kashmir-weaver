import {Link, useLocation, useNavigation} from 'react-router';
import {lazy, Suspense, useEffect, useState, type ReactNode} from 'react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CatalogSnapshot} from '~/models/types';
import type {ShopSettings} from '~/lib/shop-settings';
import type {LocalizationSnapshot} from '~/lib/localization';
import {CatalogProvider} from '~/contexts/catalog-context';
import {LocalizationProvider} from '~/contexts/localization-context';
import {CartDrawerProvider} from '~/contexts/cart-drawer-context';
import {SiteHeader} from '~/components/gulriza/SiteHeader';
import {SiteFooter} from '~/components/gulriza/SiteFooter';
import {ScrollToTop} from '~/components/gulriza/ScrollToTop';

// Code-split below-the-fold / rarely-used UI. Both render inert (fixed
// floating buttons) until interacted with, so the null Suspense fallback
// is invisible.
const CartFab = lazy(() =>
  import('~/components/gulriza/CartFab').then((m) => ({default: m.CartFab})),
);
const WebMcpTools = lazy(() =>
  import('~/components/gulriza/WebMcpTools').then((m) => ({default: m.WebMcpTools})),
);

const EMPTY_CATALOG: CatalogSnapshot = {products: [], collections: []};

interface PageLayoutProps {
  routeKey: string;
  cart: Promise<CartApiQueryFragment | null>;
  catalog: Promise<CatalogSnapshot>;
  shopSettings: ShopSettings;
  localization: LocalizationSnapshot;
  publicStoreDomain: string;
  publicAccessToken: string;
  customerAccessToken: Promise<string | null>;
  children?: React.ReactNode;
}

function RouteTransitionOutlet({
  children,
  routeKey,
}: {
  children: ReactNode;
  routeKey: string;
}) {
  const navigation = useNavigation();
  const location = useLocation();
  const isMarketReload =
    navigation.state !== 'idle' &&
    navigation.location?.search !== location.search;
  const isRouteChanging =
    navigation.state !== 'idle' &&
    navigation.location != null &&
    navigation.location.pathname !== location.pathname;
  return (
    <main
      aria-busy={isRouteChanging || undefined}
      className="transition-opacity duration-150 ease-out"
      style={{opacity: isRouteChanging || isMarketReload ? 0.55 : 1}}
    >
      <div key={routeKey}>{children}</div>
    </main>
  );
}

function ChromeHeader({
  shopSettings,
  publicStoreDomain,
  publicAccessToken,
  customerAccessToken,
}: {
  shopSettings: ShopSettings;
  publicStoreDomain: string;
  publicAccessToken: string;
  customerAccessToken: Promise<string | null>;
}) {
  const [resolvedCustomerAccessToken, setResolvedCustomerAccessToken] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void customerAccessToken.then((token) => {
      if (active) setResolvedCustomerAccessToken(token);
    });
    return () => {
      active = false;
    };
  }, [customerAccessToken]);

  return (
    <SiteHeader
      shopSettings={shopSettings}
      publicStoreDomain={publicStoreDomain}
      publicAccessToken={publicAccessToken}
      customerAccessToken={resolvedCustomerAccessToken}
    />
  );
}

export function PageLayout({
  routeKey,
  cart,
  catalog,
  shopSettings,
  localization,
  publicStoreDomain,
  publicAccessToken,
  customerAccessToken,
  children = null,
}: PageLayoutProps) {
  const [resolvedCatalog, setResolvedCatalog] =
    useState<CatalogSnapshot>(EMPTY_CATALOG);

  useEffect(() => {
    let active = true;
    void catalog.then((snapshot) => {
      if (active) setResolvedCatalog(snapshot);
    });
    return () => {
      active = false;
    };
  }, [catalog]);

  return (
    <LocalizationProvider localization={localization}>
      <CartDrawerProvider cart={cart}>
        <ScrollToTop />
        <CatalogProvider catalog={resolvedCatalog}>
          <Suspense fallback={null}>
            <WebMcpTools />
          </Suspense>
          <ChromeHeader
            shopSettings={shopSettings}
            publicStoreDomain={publicStoreDomain}
            publicAccessToken={publicAccessToken}
            customerAccessToken={customerAccessToken}
          />
          <RouteTransitionOutlet routeKey={routeKey}>{children}</RouteTransitionOutlet>
          <Suspense fallback={null}>
            <CartFab />
          </Suspense>
          <SiteFooter shopSettings={shopSettings} />
        </CatalogProvider>
      </CartDrawerProvider>
    </LocalizationProvider>
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
          className="btn-secondary tracked px-8 py-4"
        >
          Collections
        </Link>
      </div>
    </div>
  );
}
