import type {PrivacyPageViewModel} from '~/controllers';
import {LegalPageView} from '~/views/content/LegalPageView';

export function PrivacyView(props: PrivacyPageViewModel) {
  return <LegalPageView {...props} title="Privacy Policy" />;
}
