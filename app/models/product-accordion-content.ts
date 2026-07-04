import type {ProductAccordionItem, ProductBulletItem} from './types';

export const TEST_PRODUCT_CARE =
  'Dry clean only — natural fibres require gentle care.';

export const TEST_PRODUCT_GUARANTEES: ProductAccordionItem[] = [
  {title: 'Ships within', body: '24 hours of order placement'},
  {title: 'International delivery', body: '5–10 working days'},
  {title: 'India delivery', body: '2–5 working days'},
  {title: 'Free shipping', body: 'On orders over $200'},
  {title: 'Ships from', body: 'Kashmir, India'},
];

export const TEST_PRODUCT_RETURNS_CARE: ProductBulletItem[] = [
  {text: '100% refund for any manufacturing defect'},
  {text: 'All products quality-checked before dispatch'},
  {text: 'See Terms & Conditions for details', href: '/terms'},
  {text: 'Dry clean only — natural fibres require gentle care'},
  {text: 'Slight variations are a mark of hand craftsmanship'},
];

/** Variant weights for test-all-fields seed (grams). */
export const TEST_VARIANT_WEIGHTS: Record<string, number> = {
  stole: 180,
  shawl: 220,
  square: 200,
};

export function weightGramsForSizeLabel(sizeValue: string): number | undefined {
  const lower = sizeValue.toLowerCase();
  if (lower.includes('stole')) return TEST_VARIANT_WEIGHTS.stole;
  if (lower.includes('shawl')) return TEST_VARIANT_WEIGHTS.shawl;
  if (lower.includes('square')) return TEST_VARIANT_WEIGHTS.square;
  return undefined;
}
