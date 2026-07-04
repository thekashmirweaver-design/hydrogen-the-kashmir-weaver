import {formatShadeCartLabel} from '~/lib/shade-cart';

export function CartLineShade({
  attributes,
  className = 'mt-1 text-xs text-muted-foreground',
}: {
  attributes?:
    | Array<{key?: string | null; value?: string | null} | null>
    | null;
  className?: string;
}) {
  const label = formatShadeCartLabel(attributes);
  if (!label) return null;
  return <p className={className}>{label}</p>;
}
