import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {formatShopifyMoney} from '~/lib/format-money';
import {getCartPromotionSummary} from '~/lib/cart-promotions';

type FormatPrice = (money: {amount: number; currencyCode: string}) => string;

export function CartTotals({
  cart,
  formatPrice,
  compact = false,
}: {
  cart: CartApiQueryFragment | null;
  formatPrice?: FormatPrice;
  compact?: boolean;
}) {
  const {
    subtotal,
    total,
    discountTotal,
    giftCardTotal,
    hasAdjustments,
  } = getCartPromotionSummary(cart);

  const currency = subtotal?.currencyCode ?? total?.currencyCode ?? 'USD';
  const format = (amount: number) =>
    formatPrice
      ? formatPrice({amount, currencyCode: currency})
      : formatShopifyMoney(amount, currency);

  const subtotalLabel = subtotal ? format(Number(subtotal.amount)) : '—';
  const totalLabel = total ? format(Number(total.amount)) : subtotalLabel;

  const labelClass = compact
    ? 'text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground'
    : 'text-muted-foreground';
  const valueClass = compact
    ? 'font-display text-base sm:text-lg'
    : 'font-display text-lg sm:text-xl';

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3 text-sm sm:space-y-4'}>
      <Row
        label="Subtotal"
        value={subtotalLabel}
        labelClass={labelClass}
        valueClass={compact ? 'font-display text-base sm:text-lg' : undefined}
      />
      {discountTotal > 0 && (
        <Row
          label="Promo savings"
          value={`−${format(discountTotal)}`}
          labelClass={labelClass}
          valueClass="text-accent"
        />
      )}
      {giftCardTotal > 0 && (
        <Row
          label="Gift card"
          value={`−${format(giftCardTotal)}`}
          labelClass={labelClass}
          valueClass="text-accent"
        />
      )}
      {hasAdjustments && (
        <Row
          label={compact ? 'Estimated total' : 'Total'}
          value={totalLabel}
          labelClass={labelClass}
          valueClass={valueClass}
        />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  labelClass,
  valueClass,
}: {
  label: string;
  value: string;
  labelClass: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={labelClass}>{label}</span>
      <span className={valueClass ?? 'text-right'}>{value}</span>
    </div>
  );
}
