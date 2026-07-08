import {data} from 'react-router';
import {getCatalogOptions} from '~/lib/catalog-options';
import {getSortConfig} from '~/lib/catalog-pagination';
import type {SortKey} from '~/lib/catalog-pagination';
import * as CatalogRepository from '~/models/catalog.repository';
import type {Route} from './+types/api.catalog-products';

function parsePriceFilters(url: URL): Record<string, unknown>[] {
  const filters: Record<string, unknown>[] = [];
  const priceMin = url.searchParams.get('priceMin');
  const priceMax = url.searchParams.get('priceMax');
  if (priceMin || priceMax) {
    const range: Record<string, number> = {};
    if (priceMin) range.min = Number(priceMin);
    if (priceMax) range.max = Number(priceMax);
    filters.push({price: range});
  }
  return filters;
}

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');
  const after = url.searchParams.get('after');
  const handle = url.searchParams.get('handle');
  const sort = url.searchParams.get('sort') as SortKey | null;
  const catalogOptions = getCatalogOptions(context);

  const priceFilters = parsePriceFilters(url);
  if (priceFilters.length) {
    catalogOptions.filters = priceFilters;
  }

  if (sort === 'featured') {
    const filter =
      scope === 'collection' && handle ? {collectionHandle: handle} : undefined;
    const result = await CatalogRepository.listFeaturedProductsPage(
      catalogOptions,
      {after},
      filter,
    );
    if (scope === 'collection') {
      return data({products: result.products, pageInfo: result.pageInfo});
    }
    return data(result);
  }

  if (sort) {
    const isCollection = scope === 'collection';
    const {sortKey, reverse} = getSortConfig(sort, isCollection);
    catalogOptions.sortKey = sortKey;
    catalogOptions.sortReverse = reverse;
  }

  if (scope === 'shop') {
    const result = await CatalogRepository.listProductsPage(catalogOptions, {
      after,
    });
    return data(result);
  }

  if (scope === 'collection' && handle) {
    const result = await CatalogRepository.listCollectionProductsPage(
      handle,
      catalogOptions,
      {after},
    );
    return data({
      products: result.products,
      pageInfo: result.pageInfo,
    });
  }

  return data({error: 'Invalid scope'}, {status: 400});
}
