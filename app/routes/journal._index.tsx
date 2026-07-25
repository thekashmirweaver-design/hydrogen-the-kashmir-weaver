import {useLoaderData} from 'react-router';
import type {Route} from './+types/journal._index';
import {getJournalPage} from '~/controllers';
import {getJournalOptions} from '~/lib/catalog-options';
import {shopifyImageUrlAtWidth} from '~/lib/lcp-preload';
import {JournalView} from '~/views/journal/JournalView';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';
import journalFontsUrl from '~/styles/journal-fonts.css?url';

function parsePageParam(value: string | null): number {
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: journalFontsUrl},
  {
    rel: 'alternate',
    type: 'application/rss+xml',
    title: 'The Kashmir Weaver',
    href: '/feed.xml',
  },
  {
    rel: 'alternate',
    type: 'application/atom+xml',
    title: 'The Kashmir Weaver',
    href: '/feed.atom',
  },
  {
    rel: 'alternate',
    type: 'application/rss+xml',
    title: 'Journal — The Kashmir Weaver',
    href: '/journal.rss',
  },
  {
    rel: 'alternate',
    type: 'application/atom+xml',
    title: 'Journal — The Kashmir Weaver',
    href: '/journal.atom',
  },
];

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const metadata = data?.metadata ?? {
    title: 'Journal — The Kashmir Weaver',
    description:
      'Stories of heritage, craft, and quiet luxury from Kashmir.',
  };
  const storeUrl = getStoreUrlFromMatches(matches);
  const featureSrc = data?.posts?.[0]?.img;
  const featureHref = featureSrc
    ? shopifyImageUrlAtWidth(featureSrc, 640)
    : null;
  return [
    ...seoBundle({
      metadata,
      pathname: location.pathname,
      storeUrl,
    }),
    ...(featureHref
      ? [
          {
            tagName: 'link' as const,
            rel: 'preload',
            as: 'image',
            href: featureHref,
            imageSizes: '(min-width: 768px) 66vw, 100vw',
            fetchPriority: 'high',
          },
        ]
      : []),
  ];
};

export async function loader({context, request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = parsePageParam(url.searchParams.get('page'));
  return getJournalPage(getJournalOptions(context), {page});
}

export default function JournalRoute() {
  const data = useLoaderData<typeof loader>();
  return <JournalView {...data} />;
}
