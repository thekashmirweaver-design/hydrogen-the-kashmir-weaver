import type {RefundPageViewModel} from '~/controllers';
import {LegalPageView} from '~/views/content/LegalPageView';

export function RefundView(props: RefundPageViewModel) {
  return <LegalPageView {...props} title="Returns Policy" />;
}
