import {useLoaderData} from 'react-router';
import type {Route} from './+types/journal.$slug';
import {getArticlePage} from '~/controllers';
import {ArticleView} from '~/views/journal/ArticleView';
import {
  blogPostingLd,
  getStoreUrlFromMatches,
  seoBundle,
} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  if (!data?.metadata) return [{title: 'Journal — The Kashmir Weaver'}];
  const storeUrl = getStoreUrlFromMatches(matches);
  const image = data.article?.img?.startsWith('http')
    ? data.article.img
    : data.article?.img;
  return seoBundle({
    metadata: data.metadata,
    pathname: location.pathname,
    storeUrl,
    image,
    type: 'article',
    jsonLd: [
      blogPostingLd({
        title: data.article.title,
        description: data.metadata.description,
        url: location.pathname,
        image,
        datePublished: data.datePublished,
        storeUrl,
      }),
    ],
  });
};

export async function loader({params, context}: Route.LoaderArgs) {
  const slug = params.slug;
  if (!slug) throw new Response('Not found', {status: 404});
  const page = await getArticlePage(slug, context.storefront);
  if (!page) throw new Response('Not found', {status: 404});
  return page;
}

export default function ArticleRoute() {
  const {article, datePublished} = useLoaderData<typeof loader>();
  return <ArticleView article={article} datePublished={datePublished} />;
}
