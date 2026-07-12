import {
  createContext,
  lazy,
  Suspense,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {useLocation} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useLocalization} from '~/contexts/localization-context';
import {clearLiveCartCache, useLiveCart} from '~/lib/use-live-cart';

// Code-split the drawer (283 lines + deep dep graph). The chunk loads after
// the first paint; the drawer is portaled and hidden until `open` is true,
// so the null fallback is invisible.
const CartDrawer = lazy(() =>
  import('~/components/gulriza/CartDrawer').then((m) => ({default: m.CartDrawer})),
);

type CartDrawerContextValue = {
  cart: CartApiQueryFragment | null;
  cartQuantity: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

export function CartDrawerProvider({
  cart,
  children,
}: {
  cart: Promise<CartApiQueryFragment | null>;
  children: ReactNode;
}) {
  const {pathname, search} = useLocation();
  const {selectedCurrency} = useLocalization();
  const [resolvedCart, setResolvedCart] =
    useState<CartApiQueryFragment | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Lazy Suspense islands must not mount during hydration — deferred cart
  // resolution updates the tree mid-hydrate and forces client render.
  const [chromeReady, setChromeReady] = useState(false);

  useEffect(() => {
    setChromeReady(true);
  }, []);

  useEffect(() => {
    clearLiveCartCache();
  }, [selectedCurrency.countryCode, search]);

  useEffect(() => {
    let active = true;
    void cart.then((nextCart) => {
      if (!active) return;
      startTransition(() => setResolvedCart(nextCart));
    });
    return () => {
      active = false;
    };
  }, [cart]);

  const liveCart = useLiveCart(resolvedCart, {
    marketCountry: selectedCurrency.countryCode,
  });
  const cartQuantity = liveCart?.totalQuantity ?? 0;

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      cart: liveCart,
      cartQuantity,
      isOpen,
      open,
      close,
    }),
    [liveCart, cartQuantity, isOpen, open, close],
  );

  return (
    <CartDrawerContext.Provider value={value}>
      {children}
      {chromeReady ? (
        <Suspense fallback={null}>
          <CartDrawer open={isOpen} onClose={close} cart={liveCart} />
        </Suspense>
      ) : null}
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer() {
  const context = useContext(CartDrawerContext);
  if (!context) {
    throw new Error('useCartDrawer must be used within CartDrawerProvider');
  }
  return context;
}
