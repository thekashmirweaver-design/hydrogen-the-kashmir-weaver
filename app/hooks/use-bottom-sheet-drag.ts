import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

const MD_MEDIA_QUERY = '(min-width: 768px)';

function subscribeMediaQuery(query: string, callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function useIsMdUp() {
  return useSyncExternalStore(
    (callback) => subscribeMediaQuery(MD_MEDIA_QUERY, callback),
    () => window.matchMedia(MD_MEDIA_QUERY).matches,
    () => false,
  );
}

type BottomSheetDragOptions = {
  enabled: boolean;
  panelRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
};

/**
 * Drag-to-dismiss for mobile bottom sheets. Attach `dragHandleProps` to the
 * top chrome (handle + header). Only active below the md breakpoint.
 */
export function useBottomSheetDrag({
  enabled,
  panelRef,
  onDismiss,
}: BottomSheetDragOptions) {
  const isMdUp = useIsMdUp();
  // Layout mode follows viewport only — never tie to `enabled` or open animates from the right.
  const isBottomSheet = !isMdUp;
  const isSidePanel = isMdUp;
  const dragActive = enabled && isBottomSheet;

  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const dragYRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const dismissingRef = useRef(false);

  const resetDrag = useCallback(() => {
    dragYRef.current = 0;
    setDragY(0);
    setIsDragging(false);
    pointerIdRef.current = null;
    dismissingRef.current = false;
  }, []);

  useEffect(() => {
    if (isMdUp) resetDrag();
  }, [isMdUp, resetDrag]);

  useEffect(() => {
    resetDrag();
  }, [enabled, resetDrag]);

  const getPanelHeight = useCallback(() => {
    return panelRef.current?.offsetHeight ?? 480;
  }, [panelRef]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragActive || dismissingRef.current) return;
      if (event.button !== 0) return;

      pointerIdRef.current = event.pointerId;
      startYRef.current = event.clientY;
      dragYRef.current = 0;
      setDragY(0);
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [dragActive],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (
        !dragActive ||
        !isDragging ||
        pointerIdRef.current !== event.pointerId
      ) {
        return;
      }

      const next = Math.max(0, event.clientY - startYRef.current);
      dragYRef.current = next;
      setDragY(next);
    },
    [dragActive, isDragging],
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragActive || pointerIdRef.current !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      pointerIdRef.current = null;
      setIsDragging(false);

      const height = getPanelHeight();
      const threshold = Math.min(height * 0.22, 140);

      if (dragYRef.current > threshold) {
        if (dismissingRef.current) return;
        dismissingRef.current = true;
        dragYRef.current = height;
        setDragY(height);
        window.setTimeout(onDismiss, 280);
      } else {
        dragYRef.current = 0;
        setDragY(0);
      }
    },
    [dragActive, getPanelHeight, onDismiss],
  );

  const overlayOpacity =
    dragActive && dragY > 0
      ? Math.max(0.12, 1 - (dragY / getPanelHeight()) * 0.88)
      : undefined;

  return {
    dragY,
    isDragging,
    isBottomSheet,
    isSidePanel,
    overlayOpacity,
    dragHandleProps: dragActive
      ? {
          onPointerDown,
          onPointerMove,
          onPointerUp: finishDrag,
          onPointerCancel: finishDrag,
          style: {touchAction: 'none' as const, cursor: 'grab' as const},
        }
      : {},
  };
}
