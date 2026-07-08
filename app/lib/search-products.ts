import type {Storefront} from '@shopify/hydrogen';
import type {SearchProductFragment} from 'storefrontapi.generated';
import {PRODUCT_LIST_PAGE_SIZE} from '~/lib/catalog-constants';
import type {CatalogPageInfo, PaginatedProducts} from '~/lib/catalog-pagination';
import type {Product} from '~/models/types';

export const SEARCH_PRODUCTS_QUERY = `#graphql
  query SearchProducts(
    $country: CountryCode
    $language: LanguageCode
    $term: String!
    $first: Int!
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products: search(
      after: $endCursor
      first: $first
      query: $term
      sortKey: RELEVANCE
      types: [PRODUCT]
      unavailableProducts: HIDE
    ) {
      nodes {
        ... on Product {
          ...SearchProduct
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
      compareAtPrice {
        amount
        currencyCode
      }
      selectedOptions {
        name
        value
      }
      product {
        handle
        title
      }
    }
  }
` as const;

type SearchProductsQueryResult = {
  products: {
    nodes: SearchProductFragment[];
    pageInfo: CatalogPageInfo;
  };
};

export function mapSearchProductToProduct(node: SearchProductFragment): Product {
  const variant = node.selectedOrFirstAvailableVariant;
  const image = variant?.image;
  const priceAmount = Number(variant?.price?.amount ?? 0);
  const compareAmount = variant?.compareAtPrice?.amount;

  return {
    id: node.id.replace(/^gid:\/\/shopify\/Product\//, '') || node.handle,
    variantId: variant?.id,
    handle: node.handle,
    name: node.title,
    collectionSlug: 'shop',
    collectionName: 'Shop',
    price: {
      amount: priceAmount,
      currencyCode: variant?.price?.currencyCode ?? 'USD',
    },
    compareAtPrice:
      compareAmount != null
        ? {
            amount: Number(compareAmount),
            currencyCode:
              variant?.compareAtPrice?.currencyCode ??
              variant?.price?.currencyCode ??
              'USD',
          }
        : undefined,
    shortDescription: node.title,
    description: `<p>${node.title}</p>`,
    story: node.title,
    images: image?.url
      ? [
          {
            src: image.url,
            alt: image.altText ?? node.title,
            width: image.width ?? undefined,
            height: image.height ?? undefined,
          },
        ]
      : [],
    material: '100% pure pashmina cashmere',
    origin: 'Kashmir',
    weave: 'Hand-woven',
    stock: 'in',
    vendor: node.vendor ?? undefined,
    createdAt: node.publishedAt ?? new Date().toISOString(),
    publishedAt: node.publishedAt ?? undefined,
  };
}

export async function searchProductsPage(
  storefront: Storefront,
  term: string,
  options?: {first?: number; after?: string | null},
): Promise<PaginatedProducts> {
  const first = options?.first ?? PRODUCT_LIST_PAGE_SIZE;
  const data = await storefront.query<SearchProductsQueryResult>(
    SEARCH_PRODUCTS_QUERY,
    {
      variables: {
        term,
        first,
        endCursor: options?.after ?? null,
      },
    },
  );

  return {
    products: data.products.nodes.map(mapSearchProductToProduct),
    pageInfo: {
      hasNextPage: data.products.pageInfo?.hasNextPage ?? false,
      endCursor: data.products.pageInfo?.endCursor ?? null,
    },
  };
}
