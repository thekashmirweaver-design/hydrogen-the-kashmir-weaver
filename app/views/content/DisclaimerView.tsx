import type {DisclaimerPageViewModel} from '~/controllers';
import {LegalPageView} from '~/views/content/LegalPageView';

export function DisclaimerView(props: DisclaimerPageViewModel) {
  return <LegalPageView {...props} title="Disclaimer" />;
}
