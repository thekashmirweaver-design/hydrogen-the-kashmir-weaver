import type {Shade} from './static/shades';

export type {Shade};

/** Shopify-shaped image used across static and live catalog data. */
export type ProductImage = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

/** Shopify-shaped money. */
export type Money = {
  amount: number;
  currencyCode: string;
};

export type ProductAccordionItem = {
  title: string;
  body: string;
};

export type ProductBulletItem = {
  text: string;
  href?: string;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  /** Shopify sellable qty when inventory is tracked; null when untracked. */
  quantityAvailable?: number | null;
  sku?: string;
  weightLabel?: string;
  selectedOptions: Array<{name: string; value: string}>;
  price: Money;
  compareAtPrice?: Money;
  image?: ProductImage;
};

export type ProductOption = {
  name: string;
  values: string[];
};

export type ProductCollectionRef = {
  handle: string;
  name: string;
};

export type Collection = {
  id: string;
  handle: string;
  name: string;
  tagline: string;
  story: string;
  hero: ProductImage;
  seo?: { title?: string; description?: string };
};

export type Product = {
  id: string;
  variantId?: string;
  handle: string;
  name: string;
  collectionSlug: string;
  collectionName: string;
  /** All linked Shopify collections (first is primary for breadcrumbs). */
  allCollections?: ProductCollectionRef[];
  price: Money;
  compareAtPrice?: Money;
  shortDescription: string;
  description: string;
  story: string;
  images: ProductImage[];
  material: string;
  origin: string;
  weave: string;
  care?: string;
  guaranteesDelivery?: ProductAccordionItem[];
  returnsCare?: ProductBulletItem[];
  stock: "in" | "out";
  limited?: boolean;
  stockQty?: number;
  productType?: string;
  vendor?: string;
  tags?: string[];
  seo?: { title?: string; description?: string };
  createdAt: string;
  publishedAt?: string;
  variants?: ProductVariant[];
  options?: ProductOption[];
  reviews?: {rating: number; count: number};
  /** Solid pashmina shade palette (from Shopify metafield or static catalog). */
  shades?: Shade[];
  /** PDP uses local recolor canvas (image set 0) instead of Shopify gallery. */
  solidRecolor?: boolean;
};

export type CatalogSnapshot = {
  products: Product[];
  collections: Collection[];
};
