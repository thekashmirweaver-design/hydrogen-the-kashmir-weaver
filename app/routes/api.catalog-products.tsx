import {data} from 'react-router';
import {getCatalogOptions} from '~/lib/catalog-options';
import * as CatalogRepository from '~/models/catalog.repository';
import type {Route} from './+types/api.catalog-products';

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');
  const after = url.searchParams.get('after');
  const handle = url.searchParams.get('handle');
  const catalogOptions = getCatalogOptions(context);

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
