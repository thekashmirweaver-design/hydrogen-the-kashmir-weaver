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

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: Array<{name: string; value: string}>;
  price: Money;
  compareAtPrice?: Money;
  image?: ProductImage;
};

export type ProductOption = {
  name: string;
  values: string[];
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
  price: Money;
  compareAtPrice?: Money;
  shortDescription: string;
  description: string;
  story: string;
  images: ProductImage[];
  material: string;
  origin: string;
  weave: string;
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
};

export type CatalogSnapshot = {
  products: Product[];
  collections: Collection[];
};
