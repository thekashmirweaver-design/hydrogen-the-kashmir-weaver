import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {useLocation} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {CartDrawer} from '~/components/gulriza/CartDrawer';
import {useLocalization} from '~/contexts/localization-context';
import {clearLiveCartCache, useLiveCart} from '~/lib/use-live-cart';

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

  useEffect(() => {
    clearLiveCartCache();
  }, [selectedCurrency.countryCode, search]);

  useEffect(() => {
    let active = true;
    void cart.then((nextCart) => {
      if (active) setResolvedCart(nextCart);
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
      <CartDrawer open={isOpen} onClose={close} cart={liveCart} />
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
