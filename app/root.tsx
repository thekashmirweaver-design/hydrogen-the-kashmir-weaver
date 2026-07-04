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
import '~/styles/globals.css';
import {PageLayout, NotFoundView} from './components/PageLayout';
import {getSearchCatalog} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadShopSettings} from '~/lib/shop-settings';
import {loadLocalization} from '~/lib/localization';
import {debugLog} from '~/lib/debug-log';

export type RootLoader = typeof loader;

export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  if (formMethod && formMethod !== 'GET') return true;
  if (currentUrl.toString() === nextUrl.toString()) return true;

  const marketParams = ['country', 'language'] as const;
  for (const param of marketParams) {
    if (currentUrl.searchParams.get(param) !== nextUrl.searchParams.get(param)) {
      return true;
    }
  }

  return false;
};

export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Inter:wght@300;400;500&display=swap',
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
  const catalogOptions = getCatalogOptions(context);
  const [catalog, shopSettings, localization] = await Promise.all([
    getSearchCatalog(catalogOptions),
    loadShopSettings(context.storefront, {
      publicStoreDomain: context.env.PUBLIC_STORE_DOMAIN,
    }),
    loadLocalization(context.storefront),
  ]);

  debugLog(
    'root.tsx:loadCriticalData',
    'localization and env snapshot',
    {
      currencyCount: localization.currencies.length,
      currencyCodes: localization.currencies.map((c) => c.code),
      selectedCountry: localization.selectedCountry,
      selectedCurrency: localization.selectedCurrency.code,
      hasShopId: Boolean(context.env.SHOP_ID),
      hasCustomerAccountClientId: Boolean(
        context.env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
      ),
      hasCheckoutDomain: Boolean(context.env.PUBLIC_CHECKOUT_DOMAIN),
    },
    'H1-H4',
  );

  return {catalog, shopSettings, localization};
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const {customerAccount, cart, storefront} = context;
  const countryCode = storefront.i18n.country;

  async function loadCustomerAccessToken(): Promise<string | null> {
    try {
      const loggedIn = await customerAccount.isLoggedIn();
      if (loggedIn) {
        const token = (await customerAccount.getAccessToken()) ?? null;
        debugLog(
          'root.tsx:customerSession',
          'customer session resolved',
          {loggedIn: true, hasAccessToken: Boolean(token)},
          'H2',
        );
        return token;
      }
      debugLog(
        'root.tsx:customerSession',
        'customer session resolved',
        {loggedIn: false, hasAccessToken: false},
        'H2',
      );
    } catch (error) {
      debugLog(
        'root.tsx:customerSession',
        'customer session error',
        {loggedIn: false, error: error instanceof Error ? error.message : 'unknown'},
        'H2',
      );
    }
    return null;
  }

  return {
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
