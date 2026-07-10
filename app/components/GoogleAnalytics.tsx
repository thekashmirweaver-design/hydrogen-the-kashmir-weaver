import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router';

export const GA_MEASUREMENT_ID = 'G-2WQQF2JKTQ';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Sends GA4 page_view on client-side navigations (SPA).
 * Initial page load is handled by the gtag config snippet in root Layout.
 */
export function GoogleAnalytics(): null {
  const location = useLocation();
  const isFirstPath = useRef(true);

  useEffect(() => {
    if (isFirstPath.current) {
      isFirstPath.current = false;
      return;
    }
    if (typeof window.gtag !== 'function') return;
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: `${location.pathname}${location.search}`,
    });
  }, [location.pathname, location.search]);

  return null;
}
