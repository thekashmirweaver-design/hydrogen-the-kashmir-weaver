import {useLoaderData} from 'react-router';
import type {Route} from './+types/journal.$slug';
import {getArticlePage} from '~/controllers';
import {ArticleView} from '~/views/journal/ArticleView';

import {pageMetaWithOg} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  if (!data?.metadata) return [{title: 'Journal — The Kashmir Weaver'}];
  const image = data.article?.img?.startsWith('http')
    ? data.article.img
    : undefined;
  return pageMetaWithOg(data.metadata, image);
};

export async function loader({params, context}: Route.LoaderArgs) {
  const slug = params.slug;
  if (!slug) throw new Response('Not found', {status: 404});
  const page = await getArticlePage(slug, context.storefront);
  if (!page) throw new Response('Not found', {status: 404});
  return page;
}

export default function ArticleRoute() {
  const {article} = useLoaderData<typeof loader>();
  return <ArticleView article={article} />;
}
