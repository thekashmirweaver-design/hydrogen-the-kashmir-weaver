import {redirect} from 'react-router';
import type {Route} from './+types/cart.$lines';
import {
  checkoutLocale,
  toStorefrontCheckoutUrl,
} from '~/lib/resolve-checkout-url';
import {resolveStoreUrl} from '~/lib/seo';
import {shadeCartAttributesFromSearch} from '~/lib/shade-cart';

/**
 * Adds line(s) from the URL and redirects straight to checkout.
 * Preserves an existing bag when a cart cookie is present.
 *
 * Expected URL structure:
 * ```js
 * /cart/<variant_id>:<quantity>
 * ```
 */
export async function loader({request, context, params}: Route.LoaderArgs) {
  const {cart} = context;
  const {lines} = params;
  if (!lines) return redirect('/cart');
  const linesMap = lines.split(',').map((line) => {
    const lineDetails = line.split(':');
    const variantId = lineDetails[0];
    const quantity = parseInt(lineDetails[1], 10);

    return {
      merchandiseId: `gid://shopify/ProductVariant/${variantId}`,
      quantity,
    };
  });

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const shadeAttributes = shadeCartAttributesFromSearch(searchParams);

  const discount = searchParams.get('discount');
  const discountArray = discount ? [discount] : [];

  const linesWithAttributes = linesMap.map((line) =>
    shadeAttributes.length ? {...line, attributes: shadeAttributes} : line,
  );

  const existingCartId = cart.getCartId();
  let result = existingCartId
    ? await cart.addLines(linesWithAttributes)
    : await cart.create({
        lines: linesWithAttributes,
        discountCodes: discountArray,
      });

  // If the cookie pointed at a stale cart, create a fresh one.
  if (existingCartId && (result.errors?.length || !result.cart)) {
    result = await cart.create({
      lines: linesWithAttributes,
      discountCodes: discountArray,
    });
  } else if (existingCartId && discountArray.length && result.cart) {
    const discountResult = await cart.updateDiscountCodes(discountArray);
    if (discountResult.cart) {
      result = discountResult;
    }
  }

  const cartResult = result.cart;

  if (result.errors?.length || !cartResult) {
    throw new Response('Link may be expired. Try checking the URL.', {
      status: 410,
    });
  }

  const headers = cart.setCartId(cartResult.id);

  const {language, country} = context.storefront.i18n;
  const storefrontUrl = resolveStoreUrl(
    context.env.PUBLIC_STORE_URL,
    request.url,
  );
  const checkoutRedirect = toStorefrontCheckoutUrl(
    cartResult.checkoutUrl ?? '',
    context.env.PUBLIC_CHECKOUT_DOMAIN,
    checkoutLocale(language, country),
    storefrontUrl,
  );

  if (checkoutRedirect) {
    return redirect(checkoutRedirect, {headers});
  } else {
    throw new Error('No checkout URL found');
  }
}

export default function Component() {
  return null;
}
