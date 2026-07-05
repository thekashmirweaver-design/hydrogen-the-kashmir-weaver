// Ref-counted body scroll lock shared across overlays. A plain per-overlay
// save/restore of `body.overflow` breaks when overlays overlap. Counting locks
// keeps the background frozen until every overlay has closed. We also lock
// <html> and disable overscroll to stop iOS Safari scroll bleed.
let scrollLockCount = 0;
const scrollLockSaved = {body: '', html: '', overscroll: ''};

export function lockScroll() {
  if (typeof document === 'undefined') return;
  if (scrollLockCount === 0) {
    scrollLockSaved.body = document.body.style.overflow;
    scrollLockSaved.html = document.documentElement.style.overflow;
    scrollLockSaved.overscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
  }
  scrollLockCount += 1;
}

export function unlockScroll() {
  if (typeof document === 'undefined') return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = scrollLockSaved.body;
    document.documentElement.style.overflow = scrollLockSaved.html;
    document.body.style.overscrollBehavior = scrollLockSaved.overscroll;
  }
}

/** Clears any orphaned overlay scroll locks after client-side navigation. */
export function resetScrollLock() {
  if (typeof document === 'undefined') return;
  scrollLockCount = 0;
  document.body.style.overflow = scrollLockSaved.body;
  document.documentElement.style.overflow = scrollLockSaved.html;
  document.body.style.overscrollBehavior = scrollLockSaved.overscroll;
}
