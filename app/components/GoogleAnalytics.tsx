import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router';

export const GA_MEASUREMENT_ID = 'G-2WQQF2JKTQ';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let gtagLoadPromise: Promise<void> | null = null;

function loadGtag(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (typeof window.gtag === 'function') return Promise.resolve();
  if (gtagLoadPromise) return gtagLoadPromise;

  gtagLoadPromise = new Promise((resolve) => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: true,
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  return gtagLoadPromise;
}

function scheduleGtagLoad() {
  const run = () => {
    void loadGtag();
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, {timeout: 4000});
  } else {
    window.setTimeout(run, 2500);
  }

  // Also load after first interaction so early navigations still track.
  const onInteract = () => {
    run();
    window.removeEventListener('pointerdown', onInteract);
    window.removeEventListener('keydown', onInteract);
  };
  window.addEventListener('pointerdown', onInteract, {once: true, passive: true});
  window.addEventListener('keydown', onInteract, {once: true});
}

/**
 * Defers GA4 until idle / first interaction so gtag does not compete with LCP.
 * Also sends page_view on client-side navigations (SPA).
 */
export function GoogleAnalytics(): null {
  const location = useLocation();
  const isFirstPath = useRef(true);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    scheduleGtagLoad();
  }, []);

  useEffect(() => {
    if (isFirstPath.current) {
      isFirstPath.current = false;
      return;
    }
    void loadGtag().then(() => {
      if (typeof window.gtag !== 'function') return;
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: `${location.pathname}${location.search}`,
      });
    });
  }, [location.pathname, location.search]);

  return null;
}
