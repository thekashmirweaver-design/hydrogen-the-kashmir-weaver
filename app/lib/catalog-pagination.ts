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

export type SortConfig = {
  sortKey: string;
  reverse: boolean;
};

export function getSortConfig(sort: SortKey, isCollection: boolean): SortConfig {
  switch (sort) {
    case "featured":
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
