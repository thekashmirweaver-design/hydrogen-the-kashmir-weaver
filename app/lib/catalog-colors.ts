import {isColorOptionName} from '~/lib/parse-size-option';
import {SHADES, type Shade} from '~/models/static/shades';
import type {Product} from '~/models/types';

export type CatalogColor = {
  name: string;
  /** Hex from shade code / palette match when resolvable. */
  hex?: string;
};

const SHADE_BY_CODE = new Map(
  SHADES.map((shade) => [shade.code.toLowerCase(), shade] as const),
);

/** Match `set0-shade-113.png` / `shade-226-L`. */
const SHADE_IN_URL = /shade-([0-9]+(?:-[A-Z]+)?)/i;
/** Match SKUs like `TKW-SLD-113-S` / `TKW-SLD-226-L-S`. */
const SHADE_IN_SKU = /(?:^|[-_])(?:SLD|SHADE)[-_]?([0-9]+(?:-[A-Z]+)?)(?:[-_]|$)/i;

function shadeByCode(code: string | undefined): Shade | undefined {
  if (!code) return undefined;
  return SHADE_BY_CODE.get(code.toLowerCase());
}

function shadeCodeFromProduct(product: Product): string | undefined {
  for (const image of product.images) {
    const match = image.src.match(SHADE_IN_URL);
    if (match?.[1]) return match[1];
  }
  for (const variant of product.variants ?? []) {
    const match = variant.sku?.match(SHADE_IN_SKU);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function hexForColorName(name: string, productHex?: string): string | undefined {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return productHex;

  const byFamily = SHADES.find(
    (shade) => shade.family.toLowerCase() === normalized,
  );
  if (byFamily) return byFamily.hex;

  const byCode = shadeByCode(name.trim());
  if (byCode) return byCode.hex;

  return productHex;
}

/** Colour option values on a product, with hex when we can resolve one. */
export function extractProductColors(product: Product): CatalogColor[] {
  const names = new Set<string>();

  const colorOption = product.options?.find((option) =>
    isColorOptionName(option.name),
  );
  for (const value of colorOption?.values ?? []) {
    if (value.trim()) names.add(value.trim());
  }

  for (const variant of product.variants ?? []) {
    for (const option of variant.selectedOptions) {
      if (isColorOptionName(option.name) && option.value.trim()) {
        names.add(option.value.trim());
      }
    }
  }

  if (!names.size) return [];

  const productHex = shadeByCode(shadeCodeFromProduct(product))?.hex;
  const singleColorHex = names.size === 1 ? productHex : undefined;

  return [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const hex = hexForColorName(name, singleColorHex);
      return hex ? {name, hex} : {name};
    });
}

/** Unique colours across a product list (for filter sidebars). */
export function collectColorsFromProducts(products: Product[]): CatalogColor[] {
  const byName = new Map<string, CatalogColor>();

  for (const product of products) {
    const colors = product.colors?.length
      ? product.colors
      : extractProductColors(product);
    for (const color of colors) {
      const key = color.name.toLowerCase();
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, color);
        continue;
      }
      if (!existing.hex && color.hex) {
        byName.set(key, color);
      }
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function productMatchesColors(
  product: Product,
  selected: string[],
): boolean {
  if (!selected.length) return true;
  const selectedSet = new Set(selected.map((name) => name.toLowerCase()));
  const colors = product.colors?.length
    ? product.colors
    : extractProductColors(product);
  return colors.some((color) => selectedSet.has(color.name.toLowerCase()));
}
