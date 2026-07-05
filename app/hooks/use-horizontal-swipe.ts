import {useCallback, useRef} from 'react';

type SwipeHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: (e: React.TouchEvent) => void;
  onClickCapture: (e: React.MouseEvent) => void;
};

export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  threshold = 48,
  containSwipe = false,
}: {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled?: boolean;
  threshold?: number;
  /** Stop touch events reaching parent scroll containers during horizontal swipes. */
  containSwipe?: boolean;
}): SwipeHandlers {
  const startRef = useRef<{x: number; y: number} | null>(null);
  const swipedRef = useRef(false);

  const reset = useCallback(() => {
    startRef.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const touch = e.touches[0];
      if (!touch) return;
      startRef.current = {x: touch.clientX, y: touch.clientY};
      swipedRef.current = false;
    },
    [enabled],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !startRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 12) {
        swipedRef.current = true;
        if (containSwipe) e.stopPropagation();
      }
    },
    [containSwipe, enabled],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !startRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) {
        reset();
        return;
      }

      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;

      if (
        Math.abs(dx) >= threshold &&
        Math.abs(dx) > Math.abs(dy)
      ) {
        swipedRef.current = true;
        if (containSwipe) e.stopPropagation();
        if (dx < 0) onSwipeLeft();
        else onSwipeRight();
      }

      reset();
    },
    [containSwipe, enabled, onSwipeLeft, onSwipeRight, reset, threshold],
  );

  const onTouchCancel = useCallback(() => {
    reset();
  }, [reset]);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (!swipedRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    swipedRef.current = false;
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    onClickCapture,
  };
}
