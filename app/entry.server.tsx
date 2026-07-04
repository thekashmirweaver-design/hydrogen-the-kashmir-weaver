import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

function storefrontOrigins(storeUrl?: string): string[] {
  if (!storeUrl?.trim()) return [];
  try {
    return [new URL(storeUrl.trim()).origin];
  } catch {
    return [];
  }
}

function isLocalDevHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** CSP allowances for Hydrogen dev (HMR, debug tooling, account web components). */
function localDevCspOrigins(): string[] {
  const hosts = ['localhost', '127.0.0.1'];
  const schemes = ['http', 'https', 'ws', 'wss'] as const;
  return hosts.flatMap((host) =>
    schemes.map((scheme) => `${scheme}://${host}:*`),
  );
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {hostname} = new URL(request.url);
  const localDev = isLocalDevHost(hostname);
  const extraOrigins = storefrontOrigins(context.env.PUBLIC_STORE_URL);
  const devOrigins = localDev ? localDevCspOrigins() : [];

  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    styleSrc: ['https://fonts.googleapis.com'],
    fontSrc: ['https://fonts.gstatic.com', "'self'"],
    ...(extraOrigins.length || devOrigins.length
      ? {
          connectSrc: [...extraOrigins, ...devOrigins],
          imgSrc: [
            "'self'",
            'https://cdn.shopify.com',
            ...extraOrigins,
            ...devOrigins,
          ],
        }
      : {}),
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
