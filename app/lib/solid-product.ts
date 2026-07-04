import type {Product} from '~/models/types';
import type {Shade} from '~/models/static/shades';
import {SHADES} from '~/models/static/shades';

export const SOLIDS_COLLECTION_HANDLE = 'solids';

export type SolidRecolorImageSet = {
  id: string;
  label: string;
  grayscale: string;
  mask: string;
  original: string;
  /** When true, preview uses a white background (product-only shot). */
  productOnly: boolean;
};

export const SOLID_RECOLOR_IMAGE_SETS: SolidRecolorImageSet[] = [
  {
    id: '0',
    label: 'Product view',
    grayscale: '/assets/solids-recolor/0/grayscale.png',
    mask: '/assets/solids-recolor/0/mask.png',
    original: '/assets/solids-recolor/0/original.png',
    productOnly: true,
  },
  {
    id: '2',
    label: 'On model',
    grayscale: '/assets/solids-recolor/2/grayscale.jpeg',
    mask: '/assets/solids-recolor/2/mask.jpeg',
    original: '/assets/solids-recolor/2/original.jpeg',
    productOnly: false,
  },
];

export function getSolidRecolorImageSet(id: string): SolidRecolorImageSet {
  return (
    SOLID_RECOLOR_IMAGE_SETS.find((set) => set.id === id) ??
    SOLID_RECOLOR_IMAGE_SETS[0]!
  );
}

export function isSolidProduct(product: Product): boolean {
  if (product.solidRecolor) return true;
  if (product.collectionSlug === SOLIDS_COLLECTION_HANDLE) return true;
  return (
    product.allCollections?.some((c) => c.handle === SOLIDS_COLLECTION_HANDLE) ??
    false
  );
}

export function getProductShades(product: Product): Shade[] {
  if (product.shades?.length) return product.shades;
  if (isSolidProduct(product)) return SHADES;
  return [];
}

export function collectShadesFromProducts(products: Product[]): Shade[] {
  const seen = new Set<string>();
  const shades: Shade[] = [];

  for (const product of products) {
    for (const shade of getProductShades(product)) {
      if (seen.has(shade.code)) continue;
      seen.add(shade.code);
      shades.push(shade);
    }
  }

  return shades;
}

export function findShadeByCode(
  shades: Shade[],
  code: string,
): Shade | undefined {
  return shades.find((shade) => shade.code === code);
}

/** Default PDP shade — middle entry in the product palette. */
export function getDefaultSolidShadeCode(shades: Shade[]): string {
  if (!shades.length) return '';
  return shades[Math.floor(shades.length / 2)]!.code;
}

export const SOLID_COLOUR_DISCLAIMER =
  'Colours shown are representative. Slight variation may occur between the preview and the finished piece.';
