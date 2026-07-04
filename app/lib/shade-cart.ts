import type {Shade} from '~/models/static/shades';

export const SHADE_CART_ATTR = {
  code: 'Shade code',
  colour: 'Colour',
} as const;

export type CartLineAttribute = {key: string; value: string};

export function shadeCartAttributes(
  shade: Shade | null | undefined,
): CartLineAttribute[] {
  if (!shade) return [];
  return [
    {key: SHADE_CART_ATTR.code, value: shade.code},
    {key: SHADE_CART_ATTR.colour, value: shade.family},
  ];
}

export function shadeCartAttributesFromSearch(
  searchParams: URLSearchParams,
): CartLineAttribute[] {
  const code = searchParams.get('shadeCode')?.trim();
  const colour = searchParams.get('shadeColour')?.trim();
  const attrs: CartLineAttribute[] = [];
  if (code) attrs.push({key: SHADE_CART_ATTR.code, value: code});
  if (colour) attrs.push({key: SHADE_CART_ATTR.colour, value: colour});
  return attrs;
}

export function buildBuyNowShadeQuery(shade: Shade | null | undefined): string {
  if (!shade) return '';
  const params = new URLSearchParams();
  params.set('shadeCode', shade.code);
  params.set('shadeColour', shade.family);
  return params.toString();
}

export function formatShadeCartLabel(
  attributes:
    | Array<{key?: string | null; value?: string | null} | null>
    | null
    | undefined,
): string | null {
  const code = attributes?.find((a) => a?.key === SHADE_CART_ATTR.code)?.value;
  const colour = attributes?.find((a) => a?.key === SHADE_CART_ATTR.colour)?.value;
  if (colour && code) return `${colour} (${code})`;
  if (colour) return colour;
  if (code) return code;
  return null;
}
