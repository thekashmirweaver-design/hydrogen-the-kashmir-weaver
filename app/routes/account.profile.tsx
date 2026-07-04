import {redirect} from 'react-router';
import type {Route} from './+types/account.profile';
import {shopifyHostedAccountUrl} from '~/lib/shopify-account-url';
import {debugLog} from '~/lib/debug-log';

export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();
  const target = shopifyHostedAccountUrl(context.env.SHOP_ID, 'profile');
  debugLog(
    'account.profile.tsx:loader',
    'redirect to shopify hosted profile',
    {page: 'profile', target, shopId: context.env.SHOP_ID},
    'H1',
  );
  return redirect(target);
}

export default function AccountProfile() {
  return null;
}
