import {
  useLoaderData,
  data,
  type HeadersFunction,
} from 'react-router';
import type {Route} from './+types/cart';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm} from '@shopify/hydrogen';
import {
  cartWithStorefrontCheckoutUrl,
  checkoutLocale,
} from '~/lib/resolve-checkout-url';
import {CartView} from '~/views/cart/CartView';
import {persistBuyerMarket} from '~/lib/i18n';
import {resolveStoreUrl, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = () => {
  return seoBundle({
    metadata: {title: 'My Bag — The Kashmir Weaver'},
    robots: 'noindex',
  });
};

export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;
  const formData = await request.formData();
  const {action, inputs} = CartForm.getFormInput(formData);
  const lines = Array.isArray(inputs.lines) ? inputs.lines : undefined;

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];
      discountCodes.push(...inputs.discountCodes);
      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesAdd: {
      const formGiftCardCode = inputs.giftCardCode;
      const giftCardCodes = (
        formGiftCardCode ? [formGiftCardCode] : []
      ) as string[];
      result = await cart.addGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesRemove: {
      const appliedGiftCardIds = inputs.giftCardCodes as string[];
      result = await cart.removeGiftCardCodes(appliedGiftCardIds);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      const countryCode = inputs.buyerIdentity?.countryCode as string | undefined;
      const marketCurrencyCode = formData.get('marketCurrencyCode');
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      const refreshed = await cart.get();
      if (refreshed) {
        result = {...result, cart: refreshed};
      }
      if (countryCode) {
        persistBuyerMarket(
          context.session,
          countryCode,
          context.storefront.i18n.language,
          typeof marketCurrencyCode === 'string' ? marketCurrencyCode : undefined,
        );
      }
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const {cart: cartResult, errors, warnings} = result;
  const {language, country} = context.storefront.i18n;
  const storefrontUrl = resolveStoreUrl(
    context.env.PUBLIC_STORE_URL,
    request.url,
  );
  const normalizedCart = cartWithStorefrontCheckoutUrl(
    cartResult,
    context.env.PUBLIC_CHECKOUT_DOMAIN,
    checkoutLocale(language, country),
    storefrontUrl,
  );

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: normalizedCart,
      errors,
      warnings,
      analytics: {cartId},
    },
    {status, headers},
  );
}

export async function loader({request, context}: Route.LoaderArgs) {
  const {cart, storefront} = context;
  const cartData = await cart.get();
  const {language, country} = storefront.i18n;
  const storefrontUrl = resolveStoreUrl(
    context.env.PUBLIC_STORE_URL,
    request.url,
  );

  return cartWithStorefrontCheckoutUrl(
    cartData,
    context.env.PUBLIC_CHECKOUT_DOMAIN,
    checkoutLocale(language, country),
    storefrontUrl,
  );
}

export default function CartRoute() {
  const cart = useLoaderData<typeof loader>();
  return <CartView cart={cart} />;
}
