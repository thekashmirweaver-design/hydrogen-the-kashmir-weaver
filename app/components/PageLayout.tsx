import {
  Await,
  Link,
  useAsyncValue,
  useLocation,
  useNavigation,
} from 'react-router';
import {Suspense, useEffect, useMemo, useState, type ReactNode} from 'react';
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
  const activeKey = isRouteChanging
    ? `${navigation.location.pathname}${navigation.location.search}`
    : routeKey;

  return (
    <main
      key={activeKey}
      aria-busy={isRouteChanging || undefined}
      className="transition-opacity duration-150 ease-out"
      style={{opacity: isMarketReload ? 0.55 : 1}}
    >
      {isRouteChanging ? (
        <RouteLoadingSkeleton />
      ) : (
        <div key={routeKey}>{children}</div>
      )}
    </main>
  );
}

function RouteLoadingSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1600px] px-6 pt-[calc(var(--header-h)+1.5rem)] pb-12 md:px-10"
      aria-hidden
    >
      <div
        className="h-3 w-24 animate-pulse rounded"
        style={{background: 'var(--surface)'}}
      />
      <div
        className="mt-8 h-12 w-full max-w-lg animate-pulse rounded"
        style={{background: 'var(--surface)'}}
      />
    </div>
  );
}

function ChromeHeader({
  isHome,
  shopSettings,
  publicStoreDomain,
  publicAccessToken,
}: {
  isHome: boolean;
  shopSettings: ShopSettings;
  publicStoreDomain: string;
  publicAccessToken: string;
}) {
  const [resolvedCart, resolvedCustomerAccessToken] = useAsyncValue() as [
    CartApiQueryFragment | null,
    string | null,
  ];
  const liveCart = useLiveCart(resolvedCart);
  const cartQuantity = liveCart?.totalQuantity ?? 0;

  return (
    <SiteHeader
      transparent={isHome}
      cart={liveCart}
      cartQuantity={cartQuantity}
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
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [resolvedCatalog, setResolvedCatalog] =
    useState<CatalogSnapshot>(EMPTY_CATALOG);
  const chromeSession = useMemo(
    () => Promise.all([cart, customerAccessToken]),
    [cart, customerAccessToken],
  );

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
      <ScrollToTop />
      <CatalogProvider catalog={resolvedCatalog}>
        <Suspense
          fallback={
            <SiteHeader
              transparent={isHome}
              cart={null}
              cartQuantity={0}
              shopSettings={shopSettings}
              publicStoreDomain={publicStoreDomain}
              publicAccessToken={publicAccessToken}
              customerAccessToken={null}
            />
          }
        >
          <Await resolve={chromeSession}>
            <ChromeHeader
              isHome={isHome}
              shopSettings={shopSettings}
              publicStoreDomain={publicStoreDomain}
              publicAccessToken={publicAccessToken}
            />
          </Await>
        </Suspense>
        <RouteTransitionOutlet routeKey={routeKey}>{children}</RouteTransitionOutlet>
        <CartFabWithCart cart={cart} />
        <SiteFooter shopSettings={shopSettings} />
      </CatalogProvider>
    </LocalizationProvider>
  );
}

function CartFabWithCart({
  cart,
}: {
  cart: Promise<CartApiQueryFragment | null>;
}) {
  return (
    <Suspense fallback={<CartFab cartQuantity={0} />}>
      <Await resolve={cart}>
        <CartFabLive />
      </Await>
    </Suspense>
  );
}

function CartFabLive() {
  const resolvedCart = useAsyncValue() as CartApiQueryFragment | null;
  const liveCart = useLiveCart(resolvedCart);
  return <CartFab cartQuantity={liveCart?.totalQuantity ?? 0} />;
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
