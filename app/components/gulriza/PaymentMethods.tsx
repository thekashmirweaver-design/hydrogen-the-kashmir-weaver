/**
 * Accepted payment methods for this Shopify storefront.
 * Icons from Shopify's official payment_icons CDN (same assets as
 * Liquid `payment_type_img_url` / `payment_type_svg_tag` in themes).
 */
const PAYMENT_ICONS_CDN =
  'https://cdn.shopify.com/shopifycloud/storefront/assets/payment_icons';

const METHODS = [
  {
    type: 'visa',
    label: 'Visa',
    file: 'visa-b614b878.svg',
  },
  {
    type: 'master',
    label: 'Mastercard',
    file: 'master-f5a74105.svg',
  },
  {
    type: 'american_express',
    label: 'American Express',
    file: 'american_express-2bdbf0e2.svg',
  },
  {
    type: 'upi',
    label: 'UPI',
    file: 'upi-470cacf4.svg',
  },
  {
    type: 'shopify_pay',
    label: 'Shop Pay',
    file: 'shopify_pay-925ab76d.svg',
  },
] as const;

export function PaymentMethods({className = ''}: {className?: string} = {}) {
  return (
    <ul
      className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
      aria-label="Accepted payment methods"
    >
      {METHODS.map((method) => (
        <li key={method.type} className="flex items-center">
          <img
            src={`${PAYMENT_ICONS_CDN}/${method.file}`}
            alt={method.label}
            width={38}
            height={24}
            loading="lazy"
            decoding="async"
            className="h-6 w-auto"
          />
        </li>
      ))}
    </ul>
  );
}
