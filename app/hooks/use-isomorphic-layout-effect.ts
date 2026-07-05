import {useEffect, useLayoutEffect} from 'react';

/** useLayoutEffect that no-ops during SSR to avoid React hydration warnings. */
export const useIsomorphicLayoutEffect =
  typeof document !== 'undefined' ? useLayoutEffect : useEffect;
