import {useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {getHomePage} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadHomepageFeatured} from '~/lib/homepage-featured';
import {loadSharedCatalog} from '~/lib/shared-catalog';
import {HomeView} from '~/views/home/HomeView';
import {useCatalog} from '~/contexts/catalog-context';
import {
  getStoreUrlFromMatches,
  organizationLd,
  seoBundle,
  websiteLd,
} from '~/lib/seo';

const HOME_TITLE = 'The Kashmir Weaver — Timeless by nature. Woven by heritage.';
const HOME_DESC =
  'Rare hand-woven pashmina from the Himalayas. Enter the world of The Kashmir Weaver — a house of Kashmiri craft, heritage and quiet luxury.';

export const meta: Route.MetaFunction = ({location, matches}) => {
  const storeUrl = getStoreUrlFromMatches(matches);
  return seoBundle({
    metadata: {title: HOME_TITLE, description: HOME_DESC},
    pathname: location.pathname,
    storeUrl,
    jsonLd: [organizationLd(storeUrl), websiteLd(storeUrl)],
  });
};

export async function loader({context, request}: Route.LoaderArgs) {
  const catalogOptions = getCatalogOptions(context);
  const [featured, catalog] = await Promise.all([
    loadHomepageFeatured(context.storefront),
    loadSharedCatalog(request, catalogOptions),
  ]);
  const home = await getHomePage(catalogOptions, featured, catalog);
  return {
    featuredProducts: home.featuredProducts,
    featuredCollections: home.featuredCollections,
    heroImageUrl: featured.heroImageUrl,
    heroAlt: featured.heroAlt,
    collectionPreviewCount: featured.collectionPreviewCount,
  };
}

export default function HomeRoute() {
  const data = useLoaderData<typeof loader>();
  const catalog = useCatalog();

  return (
    <HomeView
      products={catalog.products}
      collectionPreviewCount={data.collectionPreviewCount}
      featuredProducts={data.featuredProducts}
      featuredCollections={data.featuredCollections}
      heroImageUrl={data.heroImageUrl}
      heroAlt={data.heroAlt}
    />
  );
}
