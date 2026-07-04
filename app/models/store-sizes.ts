/** Global size option shared across all products in the store. */
export const STORE_SIZE_OPTION_NAME = 'Size' as const;

export type StoreSize = {
  label: string;
  dimensions: string;
};

export const STORE_SIZES: readonly StoreSize[] = [
  {label: 'Stole', dimensions: '70 × 200 cm'},
  {label: 'Shawl', dimensions: '100 × 200 cm'},
  {label: 'Square Scarf', dimensions: '137 × 137 cm'},
] as const;

/** Shopify option value, e.g. "Stole (70 × 200 cm)" */
export function formatStoreSizeValue(size: StoreSize): string {
  return `${size.label} (${size.dimensions})`;
}

export const STORE_SIZE_VALUES: readonly string[] = STORE_SIZES.map(
  formatStoreSizeValue,
);

export function storeSizeProductOption(): {name: string; values: string[]} {
  return {
    name: STORE_SIZE_OPTION_NAME,
    values: [...STORE_SIZE_VALUES],
  };
}

/** Admin API `productOptions` input for productCreate / productSet */
export function shopifySizeProductOptions() {
  return [
    {
      name: STORE_SIZE_OPTION_NAME,
      values: STORE_SIZE_VALUES.map((name) => ({name})),
    },
  ];
}

/** One variant per global size at the same base price */
export function buildSizeOnlyVariants(
  price: number,
  compareAtPrice?: number,
): Array<{
  optionValues: Array<{optionName: string; name: string}>;
  price: string;
  compareAtPrice?: string;
}> {
  return STORE_SIZE_VALUES.map((value) => ({
    optionValues: [{optionName: STORE_SIZE_OPTION_NAME, name: value}],
    price: String(price),
    compareAtPrice:
      compareAtPrice != null ? String(compareAtPrice) : undefined,
  }));
}
