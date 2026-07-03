import {useCallback} from 'react';
import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {Money} from '~/models/types';
import {formatShopifyMoney} from '~/lib/format-money';

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

export const CURRENCY_COUNTRY: Record<CurrencyCode, string> = {
  USD: 'US',
  EUR: 'DE',
  GBP: 'GB',
  INR: 'IN',
  AED: 'AE',
};

export function countryForCurrency(code: CurrencyCode): string {
  return CURRENCY_COUNTRY[code] ?? 'US';
}

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

/** Format catalog prices in their native currency (Shopify Markets–aware). */
export const formatInCurrency = (money: Money) =>
  formatShopifyMoney(money.amount, money.currencyCode);

export function useFormatPrice() {
  return useCallback((money: Money) => formatInCurrency(money), []);
}
