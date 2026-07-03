import type {
  Collection,
  Money,
  Product,
  ProductImage,
  ProductOption,
  ProductVariant,
} from '../types';
import {
  COLLECTION_METAFIELDS,
  PRODUCT_METAFIELDS,
  SHOP_METAFIELDS,
} from './metafields';
import {truncateMetaDescription} from '~/lib/meta-description';

type ShopifyMoney = {amount: string; currencyCode: string};

type ShopifyImage = {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

type ShopifyMetafield = {
  key: string;
  namespace: string;
  value: string;
  type: string;
};

type ShopifyVariantNode = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: Array<{name: string; value: string}>;
  price: ShopifyMoney;
  compareAtPrice?: ShopifyMoney | null;
  image?: ShopifyImage | null;
};

type ShopifyOptionNode = {
  name: string;
  optionValues: Array<{name: string}>;
};

export type ShopifyProductNode = {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType?: string | null;
  vendor?: string | null;
  tags: string[];
  createdAt: string;
  publishedAt?: string | null;
  seo?: {title?: string | null; description?: string | null} | null;
  featuredImage?: ShopifyImage | null;
  images: {edges: Array<{node: ShopifyImage}>};
  options: ShopifyOptionNode[];
  variants: {edges: Array<{node: ShopifyVariantNode}>};
  collections: {edges: Array<{node: {handle: string; title: string}}>};
  metafields?: ShopifyMetafield[] | null;
  reviewRating?: {value?: string | null} | null;
  reviewCount?: {value?: string | null} | null;
};

export type ShopifyCollectionNode = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image?: ShopifyImage | null;
  seo?: {title?: string | null; description?: string | null} | null;
  metafields?: ShopifyMetafield[] | null;
  products?: {edges: Array<{node: ShopifyProductNode}>};
};

export type ShopifyMenuItemNode = {
  id: string;
  resourceId?: string | null;
  tags: string[];
  title: string;
  type: string;
  url?: string | null;
  items?: ShopifyMenuItemNode[];
};

export type ShopifyMenuNode = {
  id: string;
  items: ShopifyMenuItemNode[];
};

export type MappedMenuItem = {
  id: string;
  resourceId?: string;
  tags: string[];
  title: string;
  type: string;
  url?: string;
  items?: MappedMenuItem[];
};

export type ShopSettings = {
  name: string;
  description?: string;
  primaryDomainUrl?: string;
  marqueeMessages: string[];
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  instagramUrl?: string;
  facebookUrl?: string;
};

const DEFAULT_PRODUCT_IMAGE = '/assets/test-shawl.jpeg';
const DEFAULT_COLLECTION_IMAGE = '/assets/collection-classic.jpg';

const gidToId = (gid: string) => gid.split('/').pop() ?? gid;

const toMoney = (money: ShopifyMoney): Money => ({
  amount: Number.parseFloat(money.amount),
  currencyCode: money.currencyCode,
});

const toImage = (image: ShopifyImage, fallbackAlt: string): ProductImage => ({
  src: image.url,
  alt: image.altText || fallbackAlt,
  width: image.width ?? undefined,
  height: image.height ?? undefined,
});

const metafieldMap = (metafields?: ShopifyMetafield[] | null) =>
  new Map((metafields ?? []).map((field) => [field.key, field.value]));

const getMetafield = (
  fields: Map<string, string>,
  key: string,
): string | undefined => {
  const value = fields.get(key);
  return value?.trim() ? value : undefined;
};

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (value === undefined) return undefined;
  return value === 'true';
};

const parseInteger = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseStringList = (value: string | undefined): string[] | undefined => {
  if (!value?.trim()) return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String).filter(Boolean);
    }
  } catch {
    // Fall through to newline-delimited parsing.
  }

  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length ? lines : undefined;
};

const mapVariant = (node: ShopifyVariantNode): ProductVariant => ({
  id: gidToId(node.id),
  title: node.title,
  availableForSale: node.availableForSale,
  selectedOptions: node.selectedOptions,
  price: toMoney(node.price),
  compareAtPrice: node.compareAtPrice ? toMoney(node.compareAtPrice) : undefined,
  image: node.image ? toImage(node.image, node.title) : undefined,
});

const mapOptions = (options: ShopifyOptionNode[]): ProductOption[] =>
  options.map((option) => ({
    name: option.name,
    values: option.optionValues.map((value) => value.name),
  }));

const parseReviewRating = (value?: string | null): number | undefined => {
  if (!value?.trim()) return undefined;
  try {
    const parsed = JSON.parse(value) as {value?: string};
    const n = parseFloat(parsed.value ?? value);
    return Number.isFinite(n) ? n : undefined;
  } catch {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  }
};

export function mapProduct(node: ShopifyProductNode): Product {
  const fields = metafieldMap(node.metafields);
  const variants = node.variants.edges.map(({node: variant}) =>
    mapVariant(variant),
  );
  const primaryVariant = variants[0];
  const collection = node.collections.edges[0]?.node;
  const description = node.description.trim();
  const shortDescription =
    getMetafield(fields, PRODUCT_METAFIELDS.shortDescription) ??
    (description.length > 160
      ? `${description.slice(0, 157)}…`
      : description);
  const story =
    getMetafield(fields, PRODUCT_METAFIELDS.story) ?? description ?? node.title;
  const limited = parseBoolean(getMetafield(fields, PRODUCT_METAFIELDS.limited));
  const stockQty = parseInteger(getMetafield(fields, PRODUCT_METAFIELDS.stockQty));
  const reviewRating = parseReviewRating(node.reviewRating?.value);
  const reviewCount = parseInteger(node.reviewCount?.value ?? undefined);
  const inStock = primaryVariant?.availableForSale ?? false;
  const images = node.images.edges.map(({node: image}) =>
    toImage(image, node.title),
  );

  if (!images.length && node.featuredImage) {
    images.push(toImage(node.featuredImage, node.title));
  }

  return {
    id: gidToId(node.id),
    variantId: primaryVariant?.id,
    handle: node.handle,
    name: node.title,
    collectionSlug: collection?.handle ?? 'shop',
    collectionName: collection?.title ?? 'Shop',
    price: primaryVariant?.price ?? {amount: 0, currencyCode: 'USD'},
    compareAtPrice: primaryVariant?.compareAtPrice,
    shortDescription: shortDescription || node.title,
    description: description || node.title,
    story: story || node.title,
    images: images.length
      ? images
      : [{src: DEFAULT_PRODUCT_IMAGE, alt: node.title}],
    material:
      getMetafield(fields, PRODUCT_METAFIELDS.material) ??
      '100% pure pashmina cashmere',
    origin: getMetafield(fields, PRODUCT_METAFIELDS.origin) ?? 'Kashmir',
    weave:
      getMetafield(fields, PRODUCT_METAFIELDS.weave) ??
      node.productType ??
      'Hand-woven',
    stock: inStock ? 'in' : 'out',
    limited: limited ?? stockQty === 1,
    stockQty: stockQty ?? (inStock ? 1 : 0),
    productType: node.productType ?? undefined,
    vendor: node.vendor ?? undefined,
    tags: node.tags,
    seo: {
      title: node.seo?.title ?? `${node.title} — The Kashmir Weaver`,
      description: node.seo?.description ?? shortDescription ?? node.title,
    },
    createdAt: node.createdAt.slice(0, 10),
    publishedAt: node.publishedAt?.slice(0, 10),
    variants: variants.length ? variants : undefined,
    options: mapOptions(node.options),
    reviews:
      reviewRating != null && reviewCount != null && reviewCount > 0
        ? {rating: reviewRating, count: reviewCount}
        : undefined,
  };
}

export function mapCollection(node: ShopifyCollectionNode): Collection {
  const fields = metafieldMap(node.metafields);
  const hero = node.image
    ? toImage(node.image, node.title)
    : {src: DEFAULT_COLLECTION_IMAGE, alt: node.title};
  const description = node.description.trim();
  const tagline =
    getMetafield(fields, COLLECTION_METAFIELDS.tagline) ??
    description.split('.')[0] ??
    node.title;
  const story =
    getMetafield(fields, COLLECTION_METAFIELDS.story) ?? description;
  const seoTitle = node.seo?.title?.trim() || `${node.title} — The Kashmir Weaver`;
  const seoDescription =
    node.seo?.description?.trim() ||
    truncateMetaDescription(tagline) ||
    truncateMetaDescription(story) ||
    node.title;

  return {
    id: gidToId(node.id),
    handle: node.handle,
    name: node.title,
    tagline,
    story,
    hero,
    seo: {
      title: seoTitle,
      description: seoDescription,
    },
  };
}

export function mapShopSettings(
  shop: {
    name: string;
    description?: string | null;
    primaryDomain?: {url?: string | null} | null;
    metafields?: ShopifyMetafield[] | null;
  },
): ShopSettings {
  const fields = metafieldMap(shop.metafields);

  return {
    name: shop.name,
    description: shop.description ?? undefined,
    primaryDomainUrl: shop.primaryDomain?.url ?? undefined,
    marqueeMessages:
      parseStringList(getMetafield(fields, SHOP_METAFIELDS.marqueeMessages)) ??
      [],
    contactEmail: getMetafield(fields, SHOP_METAFIELDS.contactEmail),
    contactPhone: getMetafield(fields, SHOP_METAFIELDS.contactPhone),
    contactWhatsapp: getMetafield(fields, SHOP_METAFIELDS.contactWhatsapp),
    instagramUrl: getMetafield(fields, SHOP_METAFIELDS.instagramUrl),
    facebookUrl: getMetafield(fields, SHOP_METAFIELDS.facebookUrl),
  };
}

export function mapMenuItems(
  items: ShopifyMenuItemNode[] = [],
): MappedMenuItem[] {
  return items.map((item) => ({
    id: item.id,
    resourceId: item.resourceId ?? undefined,
    tags: item.tags,
    title: item.title,
    type: item.type,
    url: item.url ?? undefined,
    items: item.items?.length ? mapMenuItems(item.items) : undefined,
  }));
}
