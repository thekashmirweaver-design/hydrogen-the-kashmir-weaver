import type {CancellationPageViewModel} from '~/controllers';
import {LegalPageView} from '~/views/content/LegalPageView';

export function CancellationView(props: CancellationPageViewModel) {
  return <LegalPageView {...props} title="Cancellation Policy" />;
}
