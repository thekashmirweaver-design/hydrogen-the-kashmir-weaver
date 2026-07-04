import {
  useLoaderData,
  data,
  type HeadersFunction,
} from 'react-router';
import type {Route} from './+types/cart';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm} from '@shopify/hydrogen';
import {CartView} from '~/views/cart/CartView';
import {debugLog} from '~/lib/debug-log';

export const meta: Route.MetaFunction = () => {
  return [{title: 'My Bag — The Kashmir Weaver'}];
};

export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;
  const formData = await request.formData();
  const {action, inputs} = CartForm.getFormInput(formData);
  const lines = Array.isArray(inputs.lines) ? inputs.lines : undefined;

  debugLog(
    'cart.tsx:action:entry',
    'cart action received',
    {
      action,
      lineCount: lines?.length,
      lines: lines?.map((l) => ({
        quantity: (l as {quantity?: number}).quantity,
        attributeCount:
          (l as {attributes?: unknown[]}).attributes?.length ?? 0,
      })),
      lineIds: inputs.lineIds,
    },
    'H5',
  );

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
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const {cart: cartResult, errors, warnings} = result;

  debugLog(
    'cart.tsx:action:result',
    'cart action result',
    {
      action,
      totalQuantity: cartResult?.totalQuantity,
      errorCount: errors?.length ?? 0,
      warningCount: warnings?.length ?? 0,
      hasConflict: errors?.some((e: {extensions?: {code?: string}}) =>
        e.extensions?.code === 'CONFLICT',
      ),
    },
    'H5',
  );

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {cartId},
    },
    {status, headers},
  );
}

export async function loader({context}: Route.LoaderArgs) {
  const {cart} = context;
  return await cart.get();
}

export default function CartRoute() {
  const cart = useLoaderData<typeof loader>();
  return <CartView cart={cart} />;
}
