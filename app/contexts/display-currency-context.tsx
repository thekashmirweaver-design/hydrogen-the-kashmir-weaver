import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {createPortal} from 'react-dom';
import {
  CHECKOUT_CURRENCY,
  DEFAULT_DISPLAY_CURRENCY,
  DISPLAY_CURRENCIES,
  displayCurrencyOption,
  isDisplayCurrencyCode,
  type DisplayCurrencyOption,
} from '~/lib/display-currencies';
import {convertAmount, loadUsdFxRates} from '~/lib/fx-rates';

const STORAGE_KEY = 'tkwDisplayCurrency';

type ToastState = {
  id: number;
  message: string;
} | null;

type DisplayCurrencyContextValue = {
  currencies: DisplayCurrencyOption[];
  displayCurrency: DisplayCurrencyOption;
  checkoutCurrency: string;
  ratesReady: boolean;
  setDisplayCurrency: (code: string) => void;
  convertFrom: (amount: number, fromCurrencyCode: string) => number;
};

const DisplayCurrencyContext =
  createContext<DisplayCurrencyContextValue | null>(null);

function readStoredCurrency(): string {
  if (typeof window === 'undefined') return DEFAULT_DISPLAY_CURRENCY;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)?.toUpperCase();
    if (stored && isDisplayCurrencyCode(stored)) return stored;
  } catch {
    // ignore
  }
  return DEFAULT_DISPLAY_CURRENCY;
}

export function DisplayCurrencyProvider({children}: {children: ReactNode}) {
  const [code, setCode] = useState(DEFAULT_DISPLAY_CURRENCY);
  const [rates, setRates] = useState<Record<string, number>>({USD: 1});
  const [ratesReady, setRatesReady] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    setCode(readStoredCurrency());
  }, []);

  useEffect(() => {
    let active = true;
    void loadUsdFxRates().then((fx) => {
      if (!active) return;
      setRates(fx.rates);
      setRatesReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const setDisplayCurrency = useCallback((nextCode: string) => {
    const normalized = nextCode.toUpperCase();
    if (!isDisplayCurrencyCode(normalized)) return;

    setCode((current) => {
      if (current === normalized) return current;
      try {
        window.localStorage.setItem(STORAGE_KEY, normalized);
      } catch {
        // ignore
      }
      const option = displayCurrencyOption(normalized);
      setToast({
        id: Date.now(),
        message:
          normalized === CHECKOUT_CURRENCY
            ? `Showing prices in ${option.code}`
            : `Showing approximate ${option.code} · checkout remains ${CHECKOUT_CURRENCY}`,
      });
      return normalized;
    });
  }, []);

  const convertFrom = useCallback(
    (amount: number, fromCurrencyCode: string) =>
      convertAmount(amount, fromCurrencyCode, code, rates),
    [code, rates],
  );

  const value = useMemo<DisplayCurrencyContextValue>(
    () => ({
      currencies: DISPLAY_CURRENCIES,
      displayCurrency: displayCurrencyOption(code),
      checkoutCurrency: CHECKOUT_CURRENCY,
      ratesReady,
      setDisplayCurrency,
      convertFrom,
    }),
    [code, convertFrom, ratesReady, setDisplayCurrency],
  );

  return (
    <DisplayCurrencyContext.Provider value={value}>
      {children}
      {toast && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4"
            >
              <div
                key={toast.id}
                className="pointer-events-auto max-w-md rounded-md border px-4 py-3 text-center text-xs tracking-wide shadow-lg"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                }}
              >
                {toast.message}
              </div>
            </div>,
            document.body,
          )
        : null}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) {
    throw new Error(
      'useDisplayCurrency must be used within DisplayCurrencyProvider',
    );
  }
  return ctx;
}
