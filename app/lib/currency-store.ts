import {useCallback} from 'react';
import type {Money} from '~/models/types';
import {formatShopifyMoney} from '~/lib/format-money';

/** Format catalog prices in their native currency (Shopify Markets–aware). */
export const formatInCurrency = (money: Money) =>
  formatShopifyMoney(money.amount, money.currencyCode);

export function useFormatPrice() {
  return useCallback((money: Money) => formatInCurrency(money), []);
}
