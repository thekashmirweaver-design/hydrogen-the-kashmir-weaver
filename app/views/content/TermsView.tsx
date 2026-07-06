import type {TermsPageViewModel} from '~/controllers';
import {LegalPageView} from '~/views/content/LegalPageView';

export function TermsView(props: TermsPageViewModel) {
  return <LegalPageView {...props} title="Terms of Service" />;
}
