import {formatCartVariantLabel} from '~/lib/cart-variant-label';

export function CartLineVariant({
  productTitle,
  merchandise,
  className = 'mt-1 text-xs text-muted-foreground',
}: {
  productTitle: string;
  merchandise: {
    title?: string | null;
    selectedOptions?: Array<{name: string; value: string}> | null;
  };
  className?: string;
}) {
  const label = formatCartVariantLabel(productTitle, merchandise);
  if (!label) return null;

  return <p className={className}>{label}</p>;
}
