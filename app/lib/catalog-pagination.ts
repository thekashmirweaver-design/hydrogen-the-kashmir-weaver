import type {Product} from '~/models/types';

export type CatalogPageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export type PaginatedProducts = {
  products: Product[];
  pageInfo: CatalogPageInfo;
};

export type ProductListScope =
  | {scope: 'shop'}
  | {scope: 'collection'; handle: string};

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "best-selling";

export const DEFAULT_CATALOG_SORT: SortKey = "newest";

export type SortConfig = {
  sortKey: string;
  reverse: boolean;
};

export type CatalogFilters = {
  priceMin?: number;
  priceMax?: number;
};

export function serializeFilters(filters: CatalogFilters): string {
  const parts: string[] = [];
  if (filters.priceMin !== undefined) parts.push(`pmin:${filters.priceMin}`);
  if (filters.priceMax !== undefined) parts.push(`pmax:${filters.priceMax}`);
  return parts.join(',') || '__none__';
}

export function getSortConfig(
  sort: Exclude<SortKey, 'featured'>,
  isCollection: boolean,
): SortConfig {
  switch (sort) {
    case "newest":
      return {sortKey: isCollection ? "CREATED" : "CREATED_AT", reverse: true};
    case "price-asc":
      return {sortKey: "PRICE", reverse: false};
    case "price-desc":
      return {sortKey: "PRICE", reverse: true};
    case "best-selling":
      return {sortKey: "BEST_SELLING", reverse: false};
  }
}
