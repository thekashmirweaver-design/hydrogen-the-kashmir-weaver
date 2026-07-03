import {useCallback, useEffect, useState} from 'react';
import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {Money} from '~/models/types';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'AED';

export type Currency = {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rate: number;
};

export const CURRENCIES: Currency[] = [
  {code: 'USD', symbol: '$', name: 'US Dollar', rate: 1},
  {code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92},
  {code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79},
  {code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 83},
  {code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 3.67},
];

export const getCurrency = (code: CurrencyCode): Currency =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

type CurrencyState = {
  code: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
};

export const useCurrency = create<CurrencyState>()(
  persist(
    (set) => ({
      code: 'USD',
      setCurrency: (code) => set({code}),
    }),
    {name: 'gulriza-currency'},
  ),
);

export const formatInCurrency = (money: Money, currency: Currency) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.code,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(money.amount * currency.rate);

export function useFormatPrice() {
  const code = useCurrency((s) => s.code);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useCurrency.persist.hasHydrated()) setHydrated(true);
    return useCurrency.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const currency = getCurrency(hydrated ? code : 'USD');
  return useCallback(
    (money: Money) => formatInCurrency(money, currency),
    [currency],
  );
}
