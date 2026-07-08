import {data} from 'react-router';
import {searchProductsPage} from '~/lib/search-products';
import type {Route} from './+types/api.search-products';

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const term = url.searchParams.get('q') ?? '';
  const after = url.searchParams.get('after');

  if (!term.trim()) {
    return data({
      products: [],
      pageInfo: {hasNextPage: false, endCursor: null},
    });
  }

  const result = await searchProductsPage(context.storefront, term, {after});
  return data(result);
}
