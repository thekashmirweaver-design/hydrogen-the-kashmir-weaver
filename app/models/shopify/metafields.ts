export const METAFIELD_NAMESPACE = 'custom';

export const PRODUCT_METAFIELDS = {
  story: 'story',
  shortDescription: 'short_description',
  material: 'material',
  origin: 'origin',
  weave: 'weave',
  limited: 'limited',
  stockQty: 'stock_qty',
  care: 'care',
  guaranteesDelivery: 'guarantees_delivery',
  returnsCare: 'returns_care',
  shadePalette: 'shade_palette',
} as const;

export const COLLECTION_METAFIELDS = {
  tagline: 'tagline',
  story: 'story',
} as const;

export const SHOP_METAFIELDS = {
  marqueeMessages: 'marquee_messages',
  contactEmail: 'contact_email',
  contactPhone: 'contact_phone',
  contactWhatsapp: 'contact_whatsapp',
  instagramUrl: 'instagram_url',
  facebookUrl: 'facebook_url',
  homepageFeatured: 'homepage_featured',
} as const;

export type ProductMetafieldKey =
  (typeof PRODUCT_METAFIELDS)[keyof typeof PRODUCT_METAFIELDS];

export type CollectionMetafieldKey =
  (typeof COLLECTION_METAFIELDS)[keyof typeof COLLECTION_METAFIELDS];

export type ShopMetafieldKey =
  (typeof SHOP_METAFIELDS)[keyof typeof SHOP_METAFIELDS];

export const PRODUCT_METAFIELD_KEYS = Object.values(PRODUCT_METAFIELDS);
export const COLLECTION_METAFIELD_KEYS = Object.values(COLLECTION_METAFIELDS);
export const SHOP_METAFIELD_KEYS = Object.values(SHOP_METAFIELDS);

export type MetafieldIdentifier = {
  namespace: string;
  key: string;
};

export function metafieldIdentifiers(
  keys: readonly string[],
): MetafieldIdentifier[] {
  return keys.map((key) => ({namespace: METAFIELD_NAMESPACE, key}));
}

/** GraphQL literal list for `metafields(identifiers: [...])`. */
export function metafieldIdentifiersGql(keys: readonly string[]): string {
  return keys
    .map(
      (key) => `{namespace: "${METAFIELD_NAMESPACE}", key: "${key}"}`,
    )
    .join('\n    ');
}
