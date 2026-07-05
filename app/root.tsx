import {Analytics, getShopAnalytics, Script, useNonce} from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/root';
import favicon from '~/assets/favicon.svg';
import inter400Woff2 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
import cormorant400Woff2 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url';
import '~/styles/globals.css';
import {PageLayout, NotFoundView} from './components/PageLayout';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadShopSettings} from '~/lib/shop-settings';
import {loadLocalization} from '~/lib/localization';
import {isCartFormAction} from '~/lib/cart-form-action';
import {loadSharedCatalog, loadSharedCatalogMenu} from '~/lib/shared-catalog';
import {needsFullCatalog} from '~/lib/catalog-routes';
import {resolveStoreUrl} from '~/lib/seo';

export type RootLoader = typeof loader;

export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  formAction,
  currentUrl,
  nextUrl,
}) => {
  if (currentUrl.toString() === nextUrl.toString()) return true;

  const marketParams = ['country', 'language'] as const;
  for (const param of marketParams) {
    if (currentUrl.searchParams.get(param) !== nextUrl.searchParams.get(param)) {
      return true;
    }
  }

  // Cart fetchers sync via useLiveCart — skip refetching catalog, menus, localization.
  if (formMethod && formMethod !== 'GET' && isCartFormAction(formAction)) {
    return false;
  }

  if (formMethod && formMethod !== 'GET') return true;

  return false;
};

export function links() {
  return [
    {
      rel: 'preload',
      href: inter400Woff2,
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'preload',
      href: cormorant400Woff2,
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'preload',
      href: '/assets/hero-portrait.jpg',
      as: 'image',
      fetchPriority: 'high',
    },
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  const {storefront, env} = args.context;

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    publicStoreUrl: resolveStoreUrl(
      env.PUBLIC_STORE_URL,
      args.request.url,
    ),
    publicAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: true,
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const [shopSettings, localization] = await Promise.all([
    loadShopSettings(context.storefront, {
      publicStoreDomain: context.env.PUBLIC_STORE_DOMAIN,
    }),
    loadLocalization(context.storefront),
  ]);

  return {shopSettings, localization};
}

function loadDeferredData({context, request}: Route.LoaderArgs) {
  const {customerAccount, cart, storefront} = context;
  const countryCode = storefront.i18n.country;
  const catalogOptions = getCatalogOptions(context);
  const pathname = new URL(request.url).pathname;
  const catalogPromise = needsFullCatalog(pathname)
    ? loadSharedCatalog(request, catalogOptions)
    : loadSharedCatalogMenu(request, catalogOptions);

  async function loadCustomerAccessToken(): Promise<string | null> {
    try {
      const loggedIn = await customerAccount.isLoggedIn();
      if (loggedIn) {
        return (await customerAccount.getAccessToken()) ?? null;
      }
    } catch {
      // Guest checkout — no customer session
    }
    return null;
  }

  return {
    catalog: catalogPromise,
    cart: cart.get().then(async (cartData) => {
      if (!cartData?.id) return cartData;
      if (cartData.buyerIdentity?.countryCode === countryCode) return cartData;

      const result = await cart.updateBuyerIdentity({countryCode});
      return result.cart ?? cartData;
    }),
    isLoggedIn: customerAccount.isLoggedIn(),
    customerAccessToken: loadCustomerAccessToken(),
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,viewport-fit=cover"
        />
        <Meta />
        <Links />
        <Script
          src="https://cdn.shopify.com/storefront/web-components/account.js"
          type="module"
          crossOrigin="anonymous"
          nonce={nonce}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');

  if (!data) {
    return <Outlet />;
  }

  return (
    <Analytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <PageLayout
        cart={data.cart}
        catalog={data.catalog}
        shopSettings={data.shopSettings}
        localization={data.localization}
        publicStoreDomain={data.publicStoreDomain}
        publicAccessToken={data.publicAccessToken}
        customerAccessToken={data.customerAccessToken}
      >
        <Outlet />
      </PageLayout>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  if (errorStatus === 404) {
    return <NotFoundView />;
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-32 text-center">
      <p className="eyebrow">Error {errorStatus}</p>
      <h1 className="font-display mt-8 text-4xl" style={{fontWeight: 300}}>
        Something went wrong
      </h1>
      {errorMessage && (
        <pre className="mt-8 text-left text-sm text-muted-foreground">
          {errorMessage}
        </pre>
      )}
    </div>
  );
}
