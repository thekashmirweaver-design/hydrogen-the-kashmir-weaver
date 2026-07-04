import type {Product} from '../types';
import {usd} from '../money';
import {
  TEST_PRODUCT_CARE,
  TEST_PRODUCT_GUARANTEES,
  TEST_PRODUCT_RETURNS_CARE,
} from '../product-accordion-content';
import {SHADES} from '../static/shades';
import {
  STORE_SIZE_OPTION_NAME,
  STORE_SIZE_VALUES,
  storeSizeProductOption,
} from '../store-sizes';

/** Handle for the all-fields test product — visit /products/test-all-fields */
export const DUMMY_TEST_HANDLE = 'test-all-fields';

const img = (src: string, alt: string, width = 1200, height = 1500) => ({
  src,
  alt,
  width,
  height,
});

const VARIANT_SKUS = ['TKW-SLD-002-DL11-S', 'TKW-SLD-002-DL11-M', 'TKW-SLD-002-DL11-L'];
const VARIANT_WEIGHTS = ['180 g', '220 g', '200 g'];

const sizeOnlyVariants = STORE_SIZE_VALUES.map((size, index) => ({
  id: `gid://shopify/ProductVariant/999990000${index + 1}`,
  title: size,
  availableForSale: true,
  sku: VARIANT_SKUS[index],
  weightLabel: VARIANT_WEIGHTS[index],
  selectedOptions: [{name: STORE_SIZE_OPTION_NAME, value: size}],
  price: usd(index === 1 ? 2150 : index === 2 ? 2450 : 1890),
  compareAtPrice: usd(index === 1 ? 2450 : 2200),
  image: img('/assets/test-shawl.jpeg', `Test All Fields — ${size}`),
}));

/**
 * Fully populated product for PDP field testing.
 * Injected into static catalog only (USE_STATIC_CATALOG=true).
 */
export const DUMMY_TEST_PRODUCT: Product = {
  id: 'prod_test-all-fields',
  variantId: sizeOnlyVariants[0]?.id,
  handle: DUMMY_TEST_HANDLE,
  name: 'Test All Fields Pashmina',
  collectionSlug: 'solids',
  collectionName: 'Solid Pashmina',
  price: usd(1890),
  compareAtPrice: usd(2200),
  shortDescription:
    'A dummy piece with every catalog field populated — use this route to verify the product detail page.',
  description:
    'This is the long description block. Hand-woven in pure Changthangi pashmina, finished with Sozni embroidery along the borders. Each motif is worked by a single artisan over several weeks. Intended for layout and field testing only — not a live catalogue item.',
  story:
    'Every thread carries the silence of the Changthang plateau — a test passage for the story section, set in italic beneath the fold.',
  images: [
    img('/assets/test-shawl.jpeg', 'Test All Fields Pashmina — front view'),
    img('/assets/product-ivory.jpg', 'Test All Fields Pashmina — ivory variant'),
    img('/assets/product-midnight.jpg', 'Test All Fields Pashmina — midnight variant'),
    img('/assets/product-charcoal.jpg', 'Test All Fields Pashmina — detail'),
    img('/assets/blue-pashmina-1.jpg', 'Test All Fields Pashmina — embroidery close-up'),
  ],
  material: '100% Kashmir Pashmina Cashmere',
  origin: 'Srinagar, Kashmir, India',
  weave: 'Handloom · Sozni hand embroidery · 4 to 7 days weaving',
  care: TEST_PRODUCT_CARE,
  guaranteesDelivery: TEST_PRODUCT_GUARANTEES,
  returnsCare: TEST_PRODUCT_RETURNS_CARE,
  stock: 'in',
  limited: true,
  stockQty: 1,
  productType: 'Pashmina Shawl',
  vendor: 'The Kashmir Weaver',
  tags: ['test', 'dummy', 'solid-pashmina', 'sozni', 'limited-edition'],
  seo: {
    title: 'Test All Fields Pashmina — The Kashmir Weaver',
    description:
      'Dummy product with every field populated for PDP testing. Hand-woven pashmina from Kashmir.',
  },
  createdAt: '2026-01-15T10:00:00Z',
  publishedAt: '2026-01-20T09:00:00Z',
  reviews: {rating: 4.8, count: 12},
  options: [storeSizeProductOption()],
  variants: sizeOnlyVariants,
  shades: SHADES,
  solidRecolor: true,
};

export function isDummyTestProduct(handle: string): boolean {
  return handle === DUMMY_TEST_HANDLE;
}

export function withDummyTestProduct(products: Product[]): Product[] {
  const rest = products.filter((p) => p.handle !== DUMMY_TEST_HANDLE);
  return [DUMMY_TEST_PRODUCT, ...rest];
}
