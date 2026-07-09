import {Form, Link, useLocation} from 'react-router';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {createPortal} from 'react-dom';
import {User, X} from 'lucide-react';
import {lockScroll, unlockScroll} from '~/lib/scroll-lock';
import {useFocusTrap} from '~/hooks/use-focus-trap';

const ACCOUNT_SHEET_CLOSE_MS = 220;
const LG_MEDIA_QUERY = '(min-width: 1024px)';

function subscribeMediaQuery(query: string, callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function useIsLgUp() {
  return useSyncExternalStore(
    (callback) => subscribeMediaQuery(LG_MEDIA_QUERY, callback),
    () => window.matchMedia(LG_MEDIA_QUERY).matches,
    () => true,
  );
}

type AccountMenuItem = {
  key: string;
  label: string;
  to?: string;
  onClick?: () => void;
  destructive?: boolean;
};

function AccountMenuPanel({
  isLoggedIn,
  onNavigate,
  listClassName,
}: {
  isLoggedIn: boolean;
  onNavigate: () => void;
  listClassName?: string;
}) {
  const items: AccountMenuItem[] = isLoggedIn
    ? [
        {key: 'orders', label: 'Orders', to: '/account/orders'},
        {key: 'profile', label: 'Profile', to: '/account/profile'},
      ]
    : [
        {key: 'sign-in', label: 'Sign in', to: '/account/login'},
        {key: 'create', label: 'Create account', to: '/account/login'},
      ];

  return (
    <ul
      role="menu"
      aria-label="Account"
      className={`px-2 py-1 ${listClassName ?? ''}`}
    >
      {items.map((item) => (
        <li key={item.key} role="none">
          <Link
            to={item.to!}
            role="menuitem"
            onClick={onNavigate}
            className="flex w-full items-center rounded-md px-3 py-3 text-left text-sm tracking-wide transition-all duration-200 hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none lg:py-2.5"
            style={{color: 'var(--foreground)'}}
          >
            {item.label}
          </Link>
        </li>
      ))}
      {isLoggedIn && (
        <li role="none" className="mt-1 border-t pt-1" style={{borderColor: 'var(--border)'}}>
          <Form method="POST" action="/account/logout" role="none">
            <button
              type="submit"
              role="menuitem"
              onClick={onNavigate}
              className="flex w-full items-center rounded-md px-3 py-3 text-left text-sm tracking-wide transition-all duration-200 hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none lg:py-2.5"
              style={{color: 'var(--muted-foreground)'}}
            >
              Sign out
            </button>
          </Form>
        </li>
      )}
    </ul>
  );
}

/**
 * Header account menu — sign-in, orders, profile, and sign-out.
 * Uses Hydrogen account routes (OAuth login; hosted account redirects when signed in).
 */
export function ShopifyAccount({
  customerAccessToken,
  className = '',
  compact = false,
}: {
  publicStoreDomain?: string;
  publicAccessToken?: string;
  customerAccessToken?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const isLoggedIn = Boolean(customerAccessToken);
  const {pathname} = useLocation();
  const isLgUp = useIsLgUp();
  const [open, setOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetClosingRef = useRef(false);

  const requestClose = useCallback(() => {
    if (sheetClosingRef.current) return;
    sheetClosingRef.current = true;
    setSheetVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      sheetClosingRef.current = false;
    }, ACCOUNT_SHEET_CLOSE_MS);
  }, []);

  const handleOpen = useCallback(() => {
    sheetClosingRef.current = false;
    setOpen(true);
  }, []);

  const handleNavigate = useCallback(() => {
    if (isLgUp) {
      setOpen(false);
    } else {
      requestClose();
    }
  }, [isLgUp, requestClose]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open || isLgUp) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        requestClose();
        triggerRef.current?.focus();
      }
    };

    lockScroll();
    window.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => setSheetVisible(true));

    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
      cancelAnimationFrame(raf);
      setSheetVisible(false);
    };
  }, [open, isLgUp, requestClose]);

  useEffect(() => {
    if (!open || !isLgUp) return;

    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, isLgUp]);

  useFocusTrap(open && !isLgUp, sheetRef);

  const menuPanel = (
    <AccountMenuPanel
      isLoggedIn={isLoggedIn}
      onNavigate={handleNavigate}
      listClassName={isLgUp ? undefined : 'flex-1 min-h-0 overflow-y-auto'}
    />
  );

  const mobileSheet =
    open && !isLgUp && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close account menu"
              className="fixed inset-0 z-[80] transition-opacity duration-300 ease-out motion-reduce:transition-none"
              style={{
                background: "var(--backdrop-soft)",
                opacity: sheetVisible ? 1 : 0,
              }}
              onClick={requestClose}
            />
            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Account"
              tabIndex={-1}
              className="fixed inset-x-0 bottom-0 z-[81] flex max-h-[min(85dvh,480px)] flex-col rounded-t-2xl border-t shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)',
              }}
            >
              <div
                className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
                style={{borderColor: 'var(--border)'}}
              >
                <div className="min-w-0">
                  <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
                    Account
                  </p>
                  <p className="font-display text-lg tracking-wide">
                    {isLoggedIn ? 'Your account' : 'Welcome'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={requestClose}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:text-accent"
                >
                  <X className="h-5 w-5" strokeWidth={1} />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden py-2">
                {menuPanel}
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={wrapRef} className={`relative ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={
            isLoggedIn
              ? 'Account menu, signed in'
              : 'Account menu, sign in or create account'
          }
          onClick={() =>
            open ? (isLgUp ? setOpen(false) : requestClose()) : handleOpen()
          }
          className={`flex items-center justify-center text-foreground/80 transition hover:text-accent focus:outline-none ${
            compact ? 'h-10 w-10' : 'h-11 w-11'
          }`}
        >
          <User className="h-[18px] w-[18px]" strokeWidth={1} aria-hidden />
        </button>

        {isLgUp && (
          <div
            role="presentation"
            className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-56 max-w-[calc(100vw-2rem)] rounded-xl border py-2 shadow-2xl transition-all duration-300 ease-out origin-top-right"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              opacity: open ? 1 : 0,
              transform: open ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-8px)',
              pointerEvents: open ? 'auto' : 'none',
              visibility: open ? 'visible' : 'hidden',
            }}
          >
            {menuPanel}
          </div>
        )}
      </div>
      {mobileSheet}
    </>
  );
}
