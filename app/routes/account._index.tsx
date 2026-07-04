import {redirect} from 'react-router';
import type {Route} from './+types/account._index';
import {shopifyHostedAccountUrl} from '~/lib/shopify-account-url';
import {debugLog} from '~/lib/debug-log';

export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();
  const target = shopifyHostedAccountUrl(context.env.SHOP_ID, 'orders');
  debugLog(
    'account._index.tsx:loader',
    'redirect to shopify hosted account',
    {page: 'orders', target, shopId: context.env.SHOP_ID},
    'H1',
  );
  return redirect(target);
}

export default function AccountIndex() {
  return null;
}
