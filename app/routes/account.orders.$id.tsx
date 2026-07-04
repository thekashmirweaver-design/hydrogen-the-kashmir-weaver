import {redirect} from 'react-router';
import type {Route} from './+types/account.orders.$id';
import {shopifyHostedOrderUrl} from '~/lib/shopify-account-url';

export async function loader({params, context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();

  if (!params.id) {
    return redirect(`/account/orders`);
  }

  return redirect(
    shopifyHostedOrderUrl(context.env.SHOP_ID, params.id),
  );
}

export default function AccountOrder() {
  return null;
}
