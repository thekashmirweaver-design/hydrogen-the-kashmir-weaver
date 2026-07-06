import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {CartLineShade} from '~/components/gulriza/CartLineShade';
import {CartLineVariant} from '~/components/gulriza/CartLineVariant';
import {
  CartLineQuantityControls,
  CartLineRemoveButton,
} from '~/components/gulriza/CartLineQuantityControls';

type CartLine = CartApiQueryFragment['lines']['nodes'][number];

function formatLineMoney(
  amount: string,
  currencyCode: string,
  formatPrice?: (money: {amount: number; currencyCode: string}) => string,
) {
  if (formatPrice) {
    return formatPrice({amount: Number(amount), currencyCode});
  }
  return `${currencyCode} ${amount}`;
}

/** Shared cart line layout for the drawer (compact) and /cart page (roomy). */
export function CartLineItem({
  line,
  variant,
  onNavigate,
  formatPrice,
}: {
  line: CartLine;
  variant: 'drawer' | 'page';
  onNavigate?: () => void;
  formatPrice?: (money: {amount: number; currencyCode: string}) => string;
}) {
  const {merchandise, quantity, id: lineId, cost, attributes} = line;
  const {product, image, title} = merchandise;
  const isDrawer = variant === 'drawer';

  const imageClass = isDrawer
    ? 'relative aspect-[4/5] w-[5.5rem] shrink-0 overflow-hidden sm:w-24'
    : 'relative aspect-[4/5] w-[5.5rem] shrink-0 overflow-hidden sm:w-[7.5rem]';

  const titleClass = isDrawer
    ? 'font-display line-clamp-2 min-w-0 text-[0.95rem] leading-snug transition-colors hover:text-accent sm:text-base lg:text-lg'
    : 'font-display line-clamp-3 min-w-0 text-base leading-snug transition-colors hover:text-accent sm:text-lg sm:leading-snug';

  const lineTotalAmount =
    cost?.totalAmount ??
    (merchandise.price
      ? {
          amount: String(Number(merchandise.price.amount) * quantity),
          currencyCode: merchandise.price.currencyCode,
        }
      : null);

  const lineTotal = lineTotalAmount
    ? formatLineMoney(
        lineTotalAmount.amount,
        lineTotalAmount.currencyCode,
        formatPrice,
      )
    : '—';

  const unitPrice = formatLineMoney(
    merchandise.price.amount,
    merchandise.price.currencyCode,
    formatPrice,
  );

  return (
    <div
      className={
        isDrawer
          ? 'grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-2 border-b py-4 first:pt-0 sm:gap-x-4 sm:py-5'
          : 'grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-3 py-6 sm:gap-x-6 sm:py-8'
      }
      style={{borderColor: 'var(--border)'}}
    >
      <Link
        to={`/products/${product.handle}`}
        onClick={onNavigate}
        className={`${imageClass} row-span-2 self-start`}
        style={{background: 'var(--surface)'}}
      >
        {image?.url && (
          <img
            src={image.url}
            alt={image.altText ?? title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </Link>

      <div className="col-start-2 min-w-0">
        <Link
          to={`/products/${product.handle}`}
          onClick={onNavigate}
          className={titleClass}
          style={{fontWeight: 400}}
        >
          {product.title}
        </Link>
        <CartLineVariant
          productTitle={product.title}
          merchandise={merchandise}
          className={
            isDrawer
              ? 'mt-1 text-xs text-muted-foreground'
              : 'mt-1.5 text-sm text-muted-foreground'
          }
        />
        {!isDrawer && (
          <p className="mt-1 text-sm text-muted-foreground">{unitPrice}</p>
        )}
        <CartLineShade
          attributes={attributes}
          swatchSize="md"
          className={
            isDrawer
              ? 'mt-1.5 text-xs text-muted-foreground'
              : 'mt-2 text-sm text-muted-foreground'
          }
        />
      </div>

      <div className="col-start-3 row-start-1 shrink-0 self-start">
        <CartLineRemoveButton lineIds={[lineId]} />
      </div>

      <div
        className={`col-span-2 col-start-2 flex min-w-0 items-center justify-between gap-3 ${
          isDrawer ? 'pt-0.5' : 'pt-1'
        }`}
      >
        <CartLineQuantityControls
          lineId={lineId}
          quantity={quantity}
          compact={isDrawer}
        />
        <span
          className={`shrink-0 font-medium ${
            isDrawer ? 'text-sm' : 'text-sm sm:text-base'
          }`}
        >
          {lineTotal}
        </span>
      </div>
    </div>
  );
}
