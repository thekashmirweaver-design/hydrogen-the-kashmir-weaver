import {useSyncExternalStore} from 'react';

const LG_MEDIA_QUERY = '(min-width: 1024px)';

function subscribeMediaQuery(query: string, callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

/** True at lg breakpoint (1024px) and above. SSR defaults to mobile-first (false). */
export function useIsLgUp() {
  return useSyncExternalStore(
    (callback) => subscribeMediaQuery(LG_MEDIA_QUERY, callback),
    () => window.matchMedia(LG_MEDIA_QUERY).matches,
    () => false,
  );
}
