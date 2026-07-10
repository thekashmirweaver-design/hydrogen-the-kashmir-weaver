import type {CartApiQueryFragment} from 'storefrontapi.generated';
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
  useLocation,
} from 'react-router';
import type {Route} from './+types/root';
import inter400Woff2 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
import cormorant400Woff2 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url';
import ebGaramond400Woff2 from '@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff2?url';
// The `?url` import resolves the hashed asset path for the
// <link rel="preload"> below; the side-effect import keeps the CSS in the
// bundle. The duplicate import is intentional.
// eslint-disable-next-line import/no-duplicates
import appStylesUrl from '~/styles/globals.css?url';
import '~/styles/globals.css';
import {PageLayout, NotFoundView} from './components/PageLayout';
import {ThemeBootScript} from '~/components/gulriza/ThemeBootScript';
import {
  GA_MEASUREMENT_ID,
  GoogleAnalytics,
} from '~/components/GoogleAnalytics';
import {ThemeProvider} from '~/lib/theme';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadShopSettings} from '~/lib/shop-settings';
import {loadLocalization} from '~/lib/localization';
import {persistBuyerMarket} from '~/lib/i18n';
import {isCartFormAction} from '~/lib/cart-form-action';
import {isCompleteCart} from '~/lib/use-live-cart';
import {
  cartWithStorefrontCheckoutUrl,
  checkoutLocale,
} from '~/lib/resolve-checkout-url';
import {loadSharedCatalog, loadSharedCatalogMenu} from '~/lib/shared-catalog';
import {needsFullCatalog} from '~/lib/catalog-routes';
import {resolveStoreUrl} from '~/lib/seo';
import {heroDark, heroLight} from '~/lib/hero-image-urls';

export type RootLoader = typeof loader;

export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  formAction,
  currentUrl,
  nextUrl,
  formData,
}) => {
  if (currentUrl.toString() === nextUrl.toString()) return true;

  const marketParams = ['country', 'language'] as const;
  for (const param of marketParams) {
    if (currentUrl.searchParams.get(param) !== nextUrl.searchParams.get(param)) {
      return true;
    }
  }

  // Refresh localization immediately after a currency/market switch.
  if (formMethod && formMethod !== 'GET' && isCartFormAction(formAction)) {
    const cartInput = formData?.get('cartFormInput');
    if (typeof cartInput === 'string') {
      try {
        const {action} = JSON.parse(cartInput) as {action?: string};
        if (action === 'BuyerIdentityUpdate') return true;
      } catch {
        // fall through
      }
    }
    return false;
  }

  if (formMethod && formMethod !== 'GET') return true;

  // Reload catalog when crossing routes that need different snapshot depth.
  if (
    needsFullCatalog(currentUrl.pathname) !==
    needsFullCatalog(nextUrl.pathname)
  ) {
    // /cart has its own loader; revalidating root here replaces deferred cart
    // promises and suspends layout chrome, which blocks navigation from completing.
    if (nextUrl.pathname === '/cart') {
      return false;
    }
    return true;
  }

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
      href: ebGaramond400Woff2,
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      // Dark-theme LCP hero. WebP/JPG remain <picture> fallbacks.
      rel: 'preload',
      as: 'image',
      type: 'image/avif',
      imagesrcset: `${heroDark.avif} 1536w, ${heroDark.avifSmall} 800w`,
      imagesizes: '(min-width: 768px) 55vw, 100vw',
      fetchPriority: 'high',
      media: '(prefers-color-scheme: dark)',
    },
    {
      // Light-theme LCP hero (OS light). Stored theme may differ; CSS still swaps.
      rel: 'preload',
      as: 'image',
      type: 'image/avif',
      imagesrcset: `${heroLight.avif} 1536w, ${heroLight.avifSmall} 800w`,
      imagesizes: '(min-width: 768px) 55vw, 100vw',
      fetchPriority: 'high',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      // Preload the bundled app CSS in parallel with the HTML download so
      // the browser already has it cached when <Links/> emits the
      // blocking <link rel="stylesheet"> below. This shaves the
      // render-blocking time off FCP without losing the cascade.
      rel: 'preload',
      href: appStylesUrl,
      as: 'style',
    },
    {rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'},
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
      withPrivacyBanner: false,
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const [shopSettings, localization] = await Promise.all([
    loadShopSettings(context.storefront, {
      publicStoreDomain: context.env.PUBLIC_STORE_DOMAIN,
      canonicalStoreUrl: context.env.PUBLIC_STORE_URL,
    }),
    loadLocalization(context.storefront, context.session),
  ]);

  persistBuyerMarket(
    context.session,
    context.storefront.i18n.country,
    context.storefront.i18n.language,
    localization.selectedCurrency.code,
  );

  return {shopSettings, localization};
}

function normalizeDeferredCart(
  cartData: CartApiQueryFragment | null,
  context: Route.LoaderArgs['context'],
  requestUrl: string,
) {
  const {language, country} = context.storefront.i18n;
  const storefrontUrl = resolveStoreUrl(
    context.env.PUBLIC_STORE_URL,
    requestUrl,
  );
  return cartWithStorefrontCheckoutUrl(
    cartData,
    context.env.PUBLIC_CHECKOUT_DOMAIN,
    checkoutLocale(language, country),
    storefrontUrl,
  );
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
    cart: cart.get().then(async (cartData: CartApiQueryFragment | null) => {
      if (!cartData?.id) return normalizeDeferredCart(cartData, context, request.url);
      if (cartData.buyerIdentity?.countryCode === countryCode) {
        return normalizeDeferredCart(cartData, context, request.url);
      }

      const result = await cart.updateBuyerIdentity({countryCode});
      const refreshed = await cart.get();
      const nextCart =
        (isCompleteCart(refreshed) ? refreshed : null) ??
        (isCompleteCart(result.cart) ? result.cart : null) ??
        cartData;
      return normalizeDeferredCart(nextCart, context, request.url);
    }),
    isLoggedIn: customerAccount.isLoggedIn(),
    customerAccessToken: loadCustomerAccessToken(),
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,viewport-fit=cover"
        />
        <Meta />
        <Links />
        <ThemeBootScript nonce={nonce} />
        {/* Google Analytics (gtag.js) */}
        <Script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          nonce={nonce}
        />
        <Script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`,
          }}
        />
        <Script
          src="https://cdn.shopify.com/storefront/web-components/account.js"
          type="module"
          crossOrigin="anonymous"
          nonce={nonce}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;

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
        routeKey={routeKey}
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
      <GoogleAnalytics />
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
