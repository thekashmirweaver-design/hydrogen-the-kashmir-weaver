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
