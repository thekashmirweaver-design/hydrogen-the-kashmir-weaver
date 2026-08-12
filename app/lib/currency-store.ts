import {useCallback} from 'react';
import type {Money} from '~/models/types';
import {formatShopifyMoney} from '~/lib/format-money';
import {useDisplayCurrency} from '~/contexts/display-currency-context';
import {CHECKOUT_CURRENCY} from '~/lib/display-currencies';

/** Format catalog prices with optional display FX conversion. */
export function useFormatPrice() {
  const {displayCurrency, convertFrom, checkoutCurrency, ratesReady} =
    useDisplayCurrency();

  return useCallback(
    (money: Money) => {
      const sourceCode = money.currencyCode || checkoutCurrency;
      // Checkout currency, or rates not loaded yet: show native Shopify amount.
      if (displayCurrency.code === CHECKOUT_CURRENCY || !ratesReady) {
        return formatShopifyMoney(money.amount, sourceCode);
      }
      const converted = convertFrom(Number(money.amount), sourceCode);
      return formatShopifyMoney(Math.round(converted), displayCurrency.code);
    },
    [checkoutCurrency, convertFrom, displayCurrency.code, ratesReady],
  );
}

/** Cart / checkout amounts — always the Shopify charge currency (USD). */
export function useCheckoutFormatPrice() {
  return useCallback(
    (money: Money) =>
      formatShopifyMoney(
        money.amount,
        money.currencyCode || CHECKOUT_CURRENCY,
      ),
    [],
  );
}
