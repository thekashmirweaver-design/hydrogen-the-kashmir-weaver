import {useEffect} from 'react';
import {debugLog} from '~/lib/debug-log';

/**
 * Shopify-hosted customer account entry (orders, profile, sign-in).
 * @see https://shopify.dev/docs/storefronts/headless/bring-your-own-stack/hydrogen-with-account-component
 */
export function ShopifyAccount({
  publicStoreDomain,
  publicAccessToken,
  customerAccessToken,
  className = '',
}: {
  publicStoreDomain: string;
  publicAccessToken: string;
  customerAccessToken?: string | null;
  className?: string;
}) {
  useEffect(() => {
    debugLog(
      'ShopifyAccount.tsx:mount',
      'shopify-account component mounted',
      {
        hasStoreDomain: Boolean(publicStoreDomain),
        hasPublicToken: Boolean(publicAccessToken),
        hasCustomerToken: Boolean(customerAccessToken),
      },
      'H2',
    );
  }, [publicStoreDomain, publicAccessToken, customerAccessToken]);

  const storeDomain = publicStoreDomain.startsWith('http')
    ? publicStoreDomain
    : `https://${publicStoreDomain}`;

  return (
    <shopify-store
      store-domain={storeDomain}
      public-access-token={publicAccessToken}
      customer-access-token={customerAccessToken ?? undefined}
      className={className}
    >
      <shopify-account
        menu="customer-account-main-menu"
        sign-in-url="/account/login"
        style={{
          // Match Gulriza header icon sizing and accent.
          ['--shopify-account-signed-in-avatar-size' as string]: '2.75rem',
          ['--shopify-account-color-accent' as string]: 'var(--accent)',
          ['--shopify-account-color-text' as string]: 'var(--foreground)',
          ['--shopify-account-color-background' as string]: 'var(--surface)',
        }}
      />
    </shopify-store>
  );
}
