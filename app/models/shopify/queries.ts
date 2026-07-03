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
  ${CATALOG_MONEY_FRAGMENT}
  ${CATALOG_IMAGE_FRAGMENT}
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
    images(first: 20) {
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
  }
  ${CATALOG_IMAGE_FRAGMENT}
  ${PRODUCT_OPTION_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
  ${METAFIELD_FRAGMENT}
`;

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
  ${CATALOG_IMAGE_FRAGMENT}
  ${METAFIELD_FRAGMENT}
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

export const ALL_PRODUCTS_QUERY = `#graphql
  query CatalogAllProducts($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          ...CatalogProduct
        }
      }
    }
  }
  ${CATALOG_PRODUCT_FRAGMENT}
` as const;

export const PRODUCT_BY_HANDLE_QUERY = `#graphql
  query CatalogProductByHandle($handle: String!) {
    product(handle: $handle) {
      ...CatalogProduct
    }
  }
  ${CATALOG_PRODUCT_FRAGMENT}
` as const;

export const ALL_COLLECTIONS_QUERY = `#graphql
  query CatalogAllCollections($first: Int!) {
    collections(first: $first, sortKey: TITLE) {
      edges {
        node {
          ...CatalogCollection
        }
      }
    }
  }
  ${CATALOG_COLLECTION_FRAGMENT}
` as const;

export const COLLECTION_BY_HANDLE_QUERY = `#graphql
  query CatalogCollectionByHandle($handle: String!, $productFirst: Int!) {
    collection(handle: $handle) {
      ...CatalogCollection
      products(first: $productFirst, sortKey: CREATED, reverse: true) {
        edges {
          node {
            ...CatalogProduct
          }
        }
      }
    }
  }
  ${CATALOG_COLLECTION_FRAGMENT}
  ${CATALOG_PRODUCT_FRAGMENT}
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
