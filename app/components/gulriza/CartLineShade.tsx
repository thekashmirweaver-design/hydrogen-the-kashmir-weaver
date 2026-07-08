import {ShadeSwatch} from '~/components/gulriza/ShadeSwatch';
import {
  formatShadeCartLabel,
  parseShadeFromCartAttributes,
} from '~/lib/shade-cart';

export function CartLineShade({
  attributes,
  className = 'mt-1 text-xs text-muted-foreground',
  swatchSize = 'sm',
}: {
  attributes?:
    | Array<{key?: string | null; value?: string | null} | null>
    | null;
  className?: string;
  swatchSize?: 'sm' | 'md' | 'lg';
}) {
  const parsed = parseShadeFromCartAttributes(attributes);
  const label = formatShadeCartLabel(attributes);
  if (!label) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="min-w-0 truncate">{label}</span>
      {parsed?.hex ? (
        <ShadeSwatch hex={parsed.hex} size={swatchSize} label={label} />
      ) : null}
    </div>
  );
}
