import type {Product} from '../types';
import {usd} from '../money';

/** Handle for the all-fields test product — visit /products/test-all-fields */
export const DUMMY_TEST_HANDLE = 'test-all-fields';

const img = (src: string, alt: string, width = 1200, height = 1500) => ({
  src,
  alt,
  width,
  height,
});

/**
 * Fully populated product for PDP field testing.
 * Injected into every catalog response (Shopify + static).
 */
export const DUMMY_TEST_PRODUCT: Product = {
  id: 'prod_test-all-fields',
  variantId: 'gid://shopify/ProductVariant/9999900001',
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
    img('/assets/blue-pashmina-2.jpg', 'Test All Fields Pashmina — border detail'),
    img('/assets/himalayas.jpg', 'Test All Fields Pashmina — lifestyle'),
    img('/assets/artisan-hands.jpg', 'Test All Fields Pashmina — atelier'),
    img('/assets/collection-modern.jpg', 'Test All Fields Pashmina — drape'),
    img('/assets/craft-film.jpg', 'Test All Fields Pashmina — texture'),
  ],
  material: '100% Kashmir Pashmina Cashmere',
  origin: 'Srinagar, Kashmir, India',
  weave: 'Handloom · Sozni hand embroidery · 4 to 7 days weaving',
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
  options: [
    {name: 'Colour', values: ['Emerald', 'Midnight', 'Ivory']},
    {name: 'Size', values: ['Standard', 'Grande']},
  ],
  variants: [
    {
      id: 'gid://shopify/ProductVariant/9999900001',
      title: 'Emerald / Standard',
      availableForSale: true,
      selectedOptions: [
        {name: 'Colour', value: 'Emerald'},
        {name: 'Size', value: 'Standard'},
      ],
      price: usd(1890),
      compareAtPrice: usd(2200),
      image: img('/assets/test-shawl.jpeg', 'Emerald — Standard'),
    },
    {
      id: 'gid://shopify/ProductVariant/9999900002',
      title: 'Midnight / Standard',
      availableForSale: true,
      selectedOptions: [
        {name: 'Colour', value: 'Midnight'},
        {name: 'Size', value: 'Standard'},
      ],
      price: usd(1890),
      image: img('/assets/product-midnight.jpg', 'Midnight — Standard'),
    },
    {
      id: 'gid://shopify/ProductVariant/9999900003',
      title: 'Ivory / Standard',
      availableForSale: false,
      selectedOptions: [
        {name: 'Colour', value: 'Ivory'},
        {name: 'Size', value: 'Standard'},
      ],
      price: usd(1890),
      image: img('/assets/product-ivory.jpg', 'Ivory — Standard'),
    },
    {
      id: 'gid://shopify/ProductVariant/9999900004',
      title: 'Emerald / Grande',
      availableForSale: true,
      selectedOptions: [
        {name: 'Colour', value: 'Emerald'},
        {name: 'Size', value: 'Grande'},
      ],
      price: usd(2150),
      compareAtPrice: usd(2450),
      image: img('/assets/test-shawl.jpeg', 'Emerald — Grande'),
    },
    {
      id: 'gid://shopify/ProductVariant/9999900005',
      title: 'Midnight / Grande',
      availableForSale: true,
      selectedOptions: [
        {name: 'Colour', value: 'Midnight'},
        {name: 'Size', value: 'Grande'},
      ],
      price: usd(2150),
      image: img('/assets/product-midnight.jpg', 'Midnight — Grande'),
    },
    {
      id: 'gid://shopify/ProductVariant/9999900006',
      title: 'Ivory / Grande',
      availableForSale: false,
      selectedOptions: [
        {name: 'Colour', value: 'Ivory'},
        {name: 'Size', value: 'Grande'},
      ],
      price: usd(2150),
      image: img('/assets/product-ivory.jpg', 'Ivory — Grande'),
    },
  ],
};

export function isDummyTestProduct(handle: string): boolean {
  return handle === DUMMY_TEST_HANDLE;
}

export function withDummyTestProduct(products: Product[]): Product[] {
  const rest = products.filter((p) => p.handle !== DUMMY_TEST_HANDLE);
  return [DUMMY_TEST_PRODUCT, ...rest];
}
