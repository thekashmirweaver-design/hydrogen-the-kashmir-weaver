import {redirect} from 'react-router';
import type {Route} from './+types/cart.c.$token';
import {
  checkoutLocale,
  checkoutUrlFromCartToken,
} from '~/lib/resolve-checkout-url';

/**
 * Handles Shopify /cart/c/:token checkout handoff URLs when they land on the
 * Hydrogen storefront (e.g. from stale links or AMPS redirects).
 */
export async function loader({request, context, params}: Route.LoaderArgs) {
  const {token} = params;
  const checkoutDomain = context.env.PUBLIC_CHECKOUT_DOMAIN;
  if (!token || !checkoutDomain) return redirect('/cart');

  const url = new URL(request.url);
  const {language, country} = context.storefront.i18n;
  const checkoutRedirect = checkoutUrlFromCartToken(
    token,
    url.search,
    checkoutDomain,
    checkoutLocale(language, country),
  );

  return redirect(checkoutRedirect);
}

export default function CartCheckoutHandoff() {
  return null;
}
