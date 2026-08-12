/** Display-only currencies (FX convert from USD). Checkout remains USD. */
export type DisplayCurrencyOption = {
  code: string;
  symbol: string;
  name: string;
};

export const DISPLAY_CURRENCIES: DisplayCurrencyOption[] = [
  {code: 'USD', symbol: '$', name: 'US Dollar'},
  {code: 'INR', symbol: '₹', name: 'Indian Rupee'},
  {code: 'GBP', symbol: '£', name: 'British Pound'},
  {code: 'EUR', symbol: '€', name: 'Euro'},
  {code: 'AED', symbol: 'د.إ', name: 'UAE Dirham'},
  {code: 'AUD', symbol: 'A$', name: 'Australian Dollar'},
  {code: 'CAD', symbol: 'C$', name: 'Canadian Dollar'},
  {code: 'SGD', symbol: 'S$', name: 'Singapore Dollar'},
  {code: 'JPY', symbol: '¥', name: 'Japanese Yen'},
];

export const DEFAULT_DISPLAY_CURRENCY = 'USD';
export const CHECKOUT_CURRENCY = 'USD';

export function isDisplayCurrencyCode(code: string): boolean {
  return DISPLAY_CURRENCIES.some((c) => c.code === code);
}

export function displayCurrencyOption(code: string): DisplayCurrencyOption {
  return (
    DISPLAY_CURRENCIES.find((c) => c.code === code) ?? DISPLAY_CURRENCIES[0]
  );
}
