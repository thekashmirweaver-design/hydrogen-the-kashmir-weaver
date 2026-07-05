import {HydratedRouter} from 'react-router/dom';
import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {NonceProvider} from '@shopify/hydrogen';
import {onCLS, onINP, onLCP, type Metric} from 'web-vitals';

function reportWebVital(metric: Metric) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('hydrogen:web-vitals', {
      detail: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
      },
    }),
  );

  const gtag = (window as Window & {gtag?: (...args: unknown[]) => void}).gtag;
  if (typeof gtag === 'function') {
    gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

if (!window.location.origin.includes('webcache.googleusercontent.com')) {
  onCLS(reportWebVital);
  onINP(reportWebVital);
  onLCP(reportWebVital);

  startTransition(() => {
    // Extract nonce from existing script tags
    const existingNonce = document
      .querySelector<HTMLScriptElement>('script[nonce]')
      ?.nonce;

    hydrateRoot(
      document,
      <StrictMode>
        <NonceProvider value={existingNonce}>
          <HydratedRouter />
        </NonceProvider>
      </StrictMode>,
    );
  });
}
