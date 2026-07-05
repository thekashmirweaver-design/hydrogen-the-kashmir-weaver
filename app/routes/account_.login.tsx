import {redirect} from 'react-router';
import type {Route} from './+types/account_.login';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const acrValues = url.searchParams.get('acr_values') || undefined;
  const loginHint = url.searchParams.get('login_hint') || undefined;
  const loginHintMode = url.searchParams.get('login_hint_mode') || undefined;
  const locale = url.searchParams.get('locale') || undefined;
  const returnTo = url.searchParams.get('return_to') || undefined;

  // Customer Account OAuth uses request.origin as redirect_uri. Shopify does not
  // accept localhost callbacks — register production (or tunnel) URIs instead.
  // See docs/deploy.md § "Fix redirect_uri mismatch on account login".
  const storeUrl = (
    context.env.PUBLIC_STORE_URL ?? 'https://thekashmirweaver.in'
  ).replace(/\/$/, '');
  if (LOCAL_HOSTS.has(url.hostname)) {
    const productionLogin = new URL('/account/login', storeUrl);
    url.searchParams.forEach((value, key) => {
      productionLogin.searchParams.set(key, value);
    });
    return redirect(productionLogin.toString());
  }

  return context.customerAccount.login({
    countryCode: context.storefront.i18n.country,
    acrValues,
    loginHint,
    loginHintMode,
    locale,
  });
}
