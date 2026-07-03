import {useLoaderData} from 'react-router';
import type {Route} from './+types/faq';
import {getFaqPage} from '~/controllers';
import {FaqView} from '~/views/content/FaqView';
import {faqPageLd, ogMeta} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  const title = data?.metadata?.title ?? 'FAQ — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return [
    {title},
    ...(description ? [{name: 'description' as const, content: description}] : []),
    ...ogMeta({title, description}),
    ...(data?.faqs ? [{'script:ld+json': faqPageLd(data.faqs)}] : []),
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  return getFaqPage(context.storefront);
}

export default function FaqRoute() {
  const data = useLoaderData<typeof loader>();
  return <FaqView {...data} />;
}
