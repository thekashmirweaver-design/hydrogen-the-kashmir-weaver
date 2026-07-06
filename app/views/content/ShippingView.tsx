import type {ShippingPageViewModel} from '~/controllers';
import {LegalPageView} from '~/views/content/LegalPageView';

export function ShippingView(props: ShippingPageViewModel) {
  return <LegalPageView {...props} title="Shipping Policy" />;
}
