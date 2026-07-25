import {
  startTransition,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {Analytics, getShopAnalytics, useNonce, type CartReturn} from '@shopify/hydrogen';
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
import cormorant300Woff2 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-300-normal.woff2?url';
import cormorant300ItalicWoff2 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-300-italic.woff2?url';
// Hashed CSS URL for preload + deferred mobile apply. Do not side-effect
// import globals.css — that always emits a render-blocking link. Desktop
// gets a media-gated blocking link; mobile paints from critical CSS first.
import appStylesUrl from '~/styles/globals.css?url';
import secondaryFontsUrl from '~/styles/secondary-fonts.css?url';
import {PageLayout, NotFoundView} from './components/PageLayout';
import {HeroPreloadLink} from '~/components/gulriza/ThemeBootScript';
import {
  GoogleAnalytics,
} from '~/components/GoogleAnalytics';
import {MetaPixel, META_PIXEL_ID} from '~/components/MetaPixel';
import {ThemeProvider} from '~/lib/theme';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadShopSettings} from '~/lib/shop-settings';
import {loadLocalization} from '~/lib/localization';
import {persistBuyerMarket} from '~/lib/i18n';
import {isCartFormAction} from '~/lib/cart-form-action';
import {isCompleteCart, useSettledLiveCart} from '~/lib/use-live-cart';
import {
  cartWithStorefrontCheckoutUrl,
  checkoutLocale,
} from '~/lib/resolve-checkout-url';
import {loadSharedCatalog, loadSharedCatalogMenu} from '~/lib/shared-catalog';
import {needsFullCatalog} from '~/lib/catalog-routes';
import {resolveStoreUrl} from '~/lib/seo';

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
      // Hero display copy uses Cormorant 300; 400 weights load via secondary-fonts after paint.
      rel: 'preload',
      href: cormorant300Woff2,
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'preload',
      href: cormorant300ItalicWoff2,
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      // Preload the bundled app CSS in parallel with the HTML download so
      // the browser already has it cached when <Links/> emits the
      // blocking <link rel="stylesheet"> below.
      rel: 'preload',
      href: appStylesUrl,
      as: 'style',
    },
    {rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'},
    {
      rel: 'alternate',
      type: 'application/rss+xml',
      title: 'The Kashmir Weaver',
      href: '/feed.xml',
    },
    {
      rel: 'alternate',
      type: 'application/atom+xml',
      title: 'The Kashmir Weaver',
      href: '/feed.atom',
    },
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
    /** Meta Pixel ID for catalogue ads (ViewContent / AddToCart / InitiateCheckout).
     * Purchase fires from Shopify Customer Events / web pixel (checkout domain). */
    metaPixelId: env.PUBLIC_META_PIXEL_ID?.trim() || META_PIXEL_ID,
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

function AppStyles({nonce}: {nonce: string}) {
  // Keep in sync with HomeView hero + SiteHeader chrome so mobile async CSS
  // does not CLS when the full Tailwind bundle applies.
  const criticalCss = `
@font-face{font-family:'Inter';font-style:normal;font-display:swap;font-weight:400;src:url(${inter400Woff2}) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-display:swap;font-weight:300;src:url(${cormorant300Woff2}) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-display:swap;font-weight:300;src:url(${cormorant300ItalicWoff2}) format('woff2')}
:root{color-scheme:dark;--background:#08100f;--foreground:#f7f3ec;--accent:#ceac6c;--muted-foreground:#d6d0c6;--on-photo-fg:#f7f3ec;--on-photo-muted:#f7f3ecc7;--on-photo-accent:#ceac6c;--photo-scrim-rgb:8 16 15;--header-glass:#08100fc7;--border:#ffffff14;--surface:#0f1d1a;--marquee-h:36px;--nav-h:4.75rem}
:root[data-theme=light]{color-scheme:light;--background:#f6f1e7;--foreground:#2a221a;--accent:#8a6b34;--muted-foreground:#7a6c56;--header-glass:#f6f1e7b8;--border:#2a221a1a;--surface:#efe7d6}
@media (min-width:768px){:root{--nav-h:5rem}}
html,body{margin:0;background:var(--background);color:var(--foreground);font-family:Inter,system-ui,sans-serif;font-weight:400}
img,picture{display:block;max-width:100%}
.site-marquee{height:var(--marquee-h);box-sizing:border-box;overflow:hidden}
header{min-height:var(--nav-h);box-sizing:border-box;background:var(--header-glass)}
[data-lcp-hero]{position:relative;min-height:100dvh;width:100%;overflow:hidden}
[data-lcp-hero-media]{position:absolute;inset-block:0;inset-inline-end:0;width:100%;height:100%}
@media (min-width:768px){[data-lcp-hero-media]{width:62%}}
@media (min-width:1024px){[data-lcp-hero-media]{width:55%}}
[data-lcp-hero-media] img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}
.hero-theme-layer{position:absolute;inset:0}
.hero-theme-layer--light{display:none}
:root[data-theme=light] .hero-theme-layer--dark{display:none}
:root[data-theme=light] .hero-theme-layer--light{display:block}
`.replace(/\n/g, '');

  return (
    <>
      <style
        id="tkw-critical-css"
        dangerouslySetInnerHTML={{__html: criticalCss}}
      />
      {/* Desktop / tablet: render-blocking for matching viewports (avoids async CLS). */}
      <link
        rel="stylesheet"
        href={appStylesUrl}
        media="(min-width: 768px)"
      />
      {/* Mobile: non-blocking; activated after load via sync head script. */}
      <link
        data-async-css=""
        rel="stylesheet"
        href={appStylesUrl}
        media="print"
      />
      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html:
            "(function(){var l=document.querySelector('link[data-async-css]');if(!l)return;var desktop=window.matchMedia('(min-width:768px)').matches;var home=location.pathname==='/'||location.pathname==='';if(desktop||!home){l.media='all';return}var apply=function(){l.media='all'};if(l.sheet)apply();else l.addEventListener('load',apply);})();",
        }}
      />
      <noscript>
        <link rel="stylesheet" href={appStylesUrl} />
      </noscript>
    </>
  );
}

function SecondaryFonts() {
  useEffect(() => {
    if (document.getElementById('secondary-fonts')) return;
    const link = document.createElement('link');
    link.id = 'secondary-fonts';
    link.rel = 'stylesheet';
    link.href = secondaryFontsUrl;
    const load = () => document.head.appendChild(link);
    if (document.readyState === 'complete') {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(load, {timeout: 4000});
      } else {
        window.setTimeout(load, 1);
      }
      return;
    }
    window.addEventListener('load', () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(load, {timeout: 4000});
      } else {
        window.setTimeout(load, 1);
      }
    }, {once: true});
  }, []);
  return null;
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
        <meta
          name="p:domain_verify"
          content="cd185cc54ba7583aaa8909b821744b15"
        />
        <Meta />
        <Links />
        <AppStyles nonce={nonce} />
        <HeroPreloadLink />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <SecondaryFonts />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

/**
 * Feed CartAnalytics the settled Shopify cart (loader + completed cart
 * actions). Optimistic UI lines stay in useLiveCart for chrome only — Analytics
 * must see real Storefront `updatedAt` so cart events stay Shopify-sourced.
 */
function AnalyticsCartProvider({
  cart,
  shop,
  consent,
  marketCountry,
  children,
}: {
  cart: Promise<CartApiQueryFragment | null>;
  shop: Awaited<ReturnType<RootLoader>>['shop'];
  consent: Awaited<ReturnType<RootLoader>>['consent'];
  marketCountry?: string;
  children: ReactNode;
}) {
  const [resolvedCart, setResolvedCart] =
    useState<CartApiQueryFragment | null>(null);

  useEffect(() => {
    let active = true;
    void cart.then((next) => {
      if (!active) return;
      startTransition(() => setResolvedCart(next));
    });
    return () => {
      active = false;
    };
  }, [cart]);

  const settledCart = useSettledLiveCart(resolvedCart, {marketCountry});

  return (
    <Analytics.Provider
      cart={settledCart as CartReturn | null}
      shop={shop}
      consent={consent}
    >
      {children}
    </Analytics.Provider>
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
    <AnalyticsCartProvider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
      marketCountry={data.localization.selectedCurrency.countryCode}
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
      <MetaPixel />
    </AnalyticsCartProvider>
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
