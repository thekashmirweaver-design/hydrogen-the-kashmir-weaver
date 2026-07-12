import {useEffect} from 'react';

const ACCOUNT_JS =
  'https://cdn.shopify.com/storefront/web-components/account.js';

/**
 * Loads Shopify account web components after mount.
 * Avoids Hydrogen <Script> in the document tree during hydration — that path
 * was emitting "Expected server HTML to contain a matching <script> in <head>".
 */
export function AccountWebComponents() {
  useEffect(() => {
    if (document.querySelector(`script[src="${ACCOUNT_JS}"]`)) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = ACCOUNT_JS;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
  }, []);

  return null;
}
