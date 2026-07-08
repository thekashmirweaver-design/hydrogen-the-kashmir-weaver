import {
  COLLECTION_METAFIELD_KEYS,
  metafieldIdentifiersGql,
  PRODUCT_METAFIELD_KEYS,
  SHOP_METAFIELD_KEYS,
} from './metafields';

export const HEADER_MENU_HANDLE = 'header-menu';
export const FOOTER_MENU_HANDLE = 'footer-menu';

const PRODUCT_METAFIELD_IDENTIFIERS = metafieldIdentifiersGql(
  PRODUCT_METAFIELD_KEYS,
);
const COLLECTION_METAFIELD_IDENTIFIERS = metafieldIdentifiersGql(
  COLLECTION_METAFIELD_KEYS,
);
const SHOP_METAFIELD_IDENTIFIERS = metafieldIdentifiersGql(SHOP_METAFIELD_KEYS);

export const CATALOG_MONEY_FRAGMENT = `#graphql
  fragment CatalogMoney on MoneyV2 {
    amount
    currencyCode
  }
` as const;

export const CATALOG_IMAGE_FRAGMENT = `#graphql
  fragment CatalogImage on Image {
    id
    url
    altText
    width
    height
  }
` as const;

export const METAFIELD_FRAGMENT = `#graphql
  fragment MetafieldValue on Metafield {
    key
    namespace
    value
    type
  }
` as const;

export const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    quantityAvailable
    sku
    weight
    weightUnit
    selectedOptions {
      name
      value
    }
    price {
      ...CatalogMoney
    }
    compareAtPrice {
      ...CatalogMoney
    }
    image {
      ...CatalogImage
    }
  }
` as const;

/** Same as ProductVariantFields but omits quantityAvailable (no inventory scope). */
export const PRODUCT_VARIANT_FRAGMENT_NO_INVENTORY = `#graphql
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    sku
    weight
    weightUnit
    selectedOptions {
      name
      value
    }
    price {
      ...CatalogMoney
    }
    compareAtPrice {
      ...CatalogMoney
    }
    image {
      ...CatalogImage
    }
  }
` as const;

export const PRODUCT_OPTION_FRAGMENT = `#graphql
  fragment ProductOptionFields on ProductOption {
    name
    optionValues {
      name
    }
  }
` as const;

export const CATALOG_PRODUCT_FRAGMENT =
  `#graphql
  fragment CatalogProduct on Product {
    id
    handle
    title
    description
    descriptionHtml
    productType
    vendor
    tags
    createdAt
    publishedAt
    seo {
      title
      description
    }
    featuredImage {
      ...CatalogImage
    }
    images(first: 250) {
      edges {
        node {
          ...CatalogImage
        }
      }
    }
    options {
      ...ProductOptionFields
    }
    variants(first: 100) {
      edges {
        node {
          ...ProductVariantFields
        }
      }
    }
    collections(first: 5) {
      edges {
        node {
          id
          handle
          title
        }
      }
    }
    metafields(
      identifiers: [
        ` +
  PRODUCT_METAFIELD_IDENTIFIERS +
  `
      ]
    ) {
      ...MetafieldValue
    }
    reviewRating: metafield(namespace: "reviews", key: "rating") {
      value
    }
    reviewCount: metafield(namespace: "reviews", key: "rating_count") {
      value
    }
  }
`;

/** Include once per query that uses catalog product/collection fragments. */
export const CATALOG_QUERY_FRAGMENTS =
  CATALOG_MONEY_FRAGMENT +
  CATALOG_IMAGE_FRAGMENT +
  METAFIELD_FRAGMENT +
  PRODUCT_OPTION_FRAGMENT +
  PRODUCT_VARIANT_FRAGMENT;

export const CATALOG_QUERY_FRAGMENTS_NO_INVENTORY =
  CATALOG_MONEY_FRAGMENT +
  CATALOG_IMAGE_FRAGMENT +
  METAFIELD_FRAGMENT +
  PRODUCT_OPTION_FRAGMENT +
  PRODUCT_VARIANT_FRAGMENT_NO_INVENTORY;

export const CATALOG_COLLECTION_FRAGMENT =
  `#graphql
  fragment CatalogCollection on Collection {
    id
    handle
    title
    description
    image {
      ...CatalogImage
    }
    seo {
      title
      description
    }
    metafields(
      identifiers: [
        ` +
  COLLECTION_METAFIELD_IDENTIFIERS +
  `
      ]
    ) {
      ...MetafieldValue
    }
  }
`;

export const MENU_FRAGMENT = `#graphql
  fragment CatalogMenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
  fragment CatalogChildMenuItem on MenuItem {
    ...CatalogMenuItem
  }
  fragment CatalogParentMenuItem on MenuItem {
    ...CatalogMenuItem
    items {
      ...CatalogChildMenuItem
    }
  }
  fragment CatalogMenu on Menu {
    id
    items {
      ...CatalogParentMenuItem
    }
  }
` as const;

export const CATALOG_PAGE_INFO_FRAGMENT = `#graphql
  fragment CatalogPageInfo on PageInfo {
    hasNextPage
    endCursor
  }
` as const;

export const ALL_PRODUCTS_QUERY = `#graphql
  query CatalogAllProducts(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $after: String
    $sortKey: ProductSortKeys!
    $reverse: Boolean!
  ) @inContext(country: $country, language: $language) {
    products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
      edges {
        node {
          ...CatalogProduct
        }
      }
      pageInfo {
        ...CatalogPageInfo
      }
    }
  }
  ${CATALOG_QUERY_FRAGMENTS}
  ${CATALOG_PRODUCT_FRAGMENT}
  ${CATALOG_PAGE_INFO_FRAGMENT}
` as const;

export const CATALOG_MENU_PRODUCT_FRAGMENT = `#graphql
  fragment CatalogMenuProduct on Product {
    id
    handle
    title
    description
    availableForSale
    createdAt
    featuredImage {
      ...CatalogImage
    }
    priceRange {
      minVariantPrice {
        ...CatalogMoney
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...CatalogMoney
      }
    }
    collections(first: 1) {
      edges {
        node {
          handle
          title
        }
      }
    }
  }
` as const;

export const ALL_MENU_PRODUCTS_QUERY = `#graphql
  query CatalogMenuProducts(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
  ) @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          ...CatalogMenuProduct
        }
      }
    }
  }
  ${CATALOG_MONEY_FRAGMENT}
  ${CATALOG_IMAGE_FRAGMENT}
  ${CATALOG_MENU_PRODUCT_FRAGMENT}
` as const;

export const PRODUCT_BY_HANDLE_QUERY = `#graphql
  query CatalogProductByHandle(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...CatalogProduct
    }
  }
  ${CATALOG_QUERY_FRAGMENTS}
  ${CATALOG_PRODUCT_FRAGMENT}
` as const;

export const PRODUCT_BY_HANDLE_QUERY_NO_INVENTORY = `#graphql
  query CatalogProductByHandle(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...CatalogProduct
    }
  }
  ${CATALOG_QUERY_FRAGMENTS_NO_INVENTORY}
  ${CATALOG_PRODUCT_FRAGMENT}
` as const;

export const ALL_PRODUCTS_QUERY_NO_INVENTORY = `#graphql
  query CatalogAllProductsNoInventory(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $after: String
    $sortKey: ProductSortKeys!
    $reverse: Boolean!
  ) @inContext(country: $country, language: $language) {
    products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
      edges {
        node {
          ...CatalogProduct
        }
      }
      pageInfo {
        ...CatalogPageInfo
      }
    }
  }
  ${CATALOG_QUERY_FRAGMENTS_NO_INVENTORY}
  ${CATALOG_PRODUCT_FRAGMENT}
  ${CATALOG_PAGE_INFO_FRAGMENT}
` as const;

export const ALL_COLLECTIONS_QUERY = `#graphql
  query CatalogAllCollections(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
  ) @inContext(country: $country, language: $language) {
    collections(first: $first, sortKey: TITLE) {
      edges {
        node {
          ...CatalogCollection
        }
      }
    }
  }
  ${CATALOG_IMAGE_FRAGMENT}
  ${METAFIELD_FRAGMENT}
  ${CATALOG_COLLECTION_FRAGMENT}
` as const;

export const COLLECTION_BY_HANDLE_QUERY = `#graphql
  query CatalogCollectionByHandle(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
    $productFirst: Int!
    $productAfter: String
    $productSortKey: ProductCollectionSortKeys!
    $productReverse: Boolean!
    $productFilters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      ...CatalogCollection
      products(first: $productFirst, after: $productAfter, sortKey: $productSortKey, reverse: $productReverse, filters: $productFilters) {
        edges {
          node {
            ...CatalogProduct
          }
        }
        pageInfo {
          ...CatalogPageInfo
        }
      }
    }
  }
  ${CATALOG_QUERY_FRAGMENTS}
  ${CATALOG_COLLECTION_FRAGMENT}
  ${CATALOG_PRODUCT_FRAGMENT}
  ${CATALOG_PAGE_INFO_FRAGMENT}
` as const;

export const COLLECTION_BY_HANDLE_QUERY_NO_INVENTORY = `#graphql
  query CatalogCollectionByHandle(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
    $productFirst: Int!
    $productAfter: String
    $productSortKey: ProductCollectionSortKeys!
    $productReverse: Boolean!
    $productFilters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      ...CatalogCollection
      products(first: $productFirst, after: $productAfter, sortKey: $productSortKey, reverse: $productReverse, filters: $productFilters) {
        edges {
          node {
            ...CatalogProduct
          }
        }
        pageInfo {
          ...CatalogPageInfo
        }
      }
    }
  }
  ${CATALOG_QUERY_FRAGMENTS_NO_INVENTORY}
  ${CATALOG_COLLECTION_FRAGMENT}
  ${CATALOG_PRODUCT_FRAGMENT}
  ${CATALOG_PAGE_INFO_FRAGMENT}
` as const;

export const SHOP_CATALOG_QUERY =
  `#graphql
  query CatalogShop(
    $country: CountryCode
    $language: LanguageCode
    $headerMenuHandle: String!
    $footerMenuHandle: String!
  ) @inContext(language: $language, country: $country) {
    shop {
      id
      name
      description
      primaryDomain {
        url
      }
      metafields(
        identifiers: [
          ` +
  SHOP_METAFIELD_IDENTIFIERS +
  `
        ]
      ) {
        ...MetafieldValue
      }
    }
    headerMenu: menu(handle: $headerMenuHandle) {
      ...CatalogMenu
    }
    footerMenu: menu(handle: $footerMenuHandle) {
      ...CatalogMenu
    }
  }
  ${METAFIELD_FRAGMENT}
  ${MENU_FRAGMENT}
`;
