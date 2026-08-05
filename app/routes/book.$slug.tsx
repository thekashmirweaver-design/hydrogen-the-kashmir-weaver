import {useLoaderData} from 'react-router';
import type {Route} from './+types/book.$slug';
import {
  bookMeta,
  bookSectionBody,
  bookSectionLabel,
  bookSections,
  getBookSection,
} from '~/lib/book/registry';
import {blocksToHtml, inlineToPlain, parseBookMarkdown} from '~/lib/book/markdown';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadSharedCatalogMenu} from '~/lib/shared-catalog';
import {truncateMetaDescription} from '~/lib/meta-description';
import {bookChapterLd, getStoreUrlFromMatches, seoBundle} from '~/lib/seo';
import type {PdfShopCollection} from '~/workers/book-pdf';
import {BookSectionView} from '~/views/book/BookSectionView';

function sectionDescription(markdown: string): string | undefined {
  const firstParagraph = parseBookMarkdown(markdown).find(
    (block) => block.type === 'paragraph',
  );
  if (!firstParagraph || firstParagraph.type !== 'paragraph') return undefined;
  return truncateMetaDescription(inlineToPlain(firstParagraph.text).replace(/\s+/g, ' '));
}

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  if (!data) return [{title: 'The Book — The Kashmir Weaver'}];
  const title = `${bookSectionLabel(data.section)} — ${data.section.title} — The Kashmir Weaver`;
  const storeUrl = getStoreUrlFromMatches(matches);
  return seoBundle({
    metadata: {title, description: data.description},
    pathname: location.pathname,
    storeUrl,
    type: 'article',
    jsonLd: [
      bookChapterLd({
        title: data.section.title,
        description: data.description,
        url: location.pathname,
        storeUrl,
        bookName: data.meta.title,
        bookUrl: '/book',
      }),
    ],
  });
};

export async function loader({params, context, request}: Route.LoaderArgs) {
  const slug = params.slug;
  const section = slug ? getBookSection(slug) : undefined;
  if (!section) throw new Response('Not found', {status: 404});

  const html = blocksToHtml(
    parseBookMarkdown(bookSectionBody(section.slug)),
    section.title,
  );

  const description = section.subtitle.trim()
    ? truncateMetaDescription(section.subtitle)
    : sectionDescription(bookSectionBody(section.slug));

  const sections = bookSections;
  const index = sections.findIndex((s) => s.slug === section.slug);

  let collections: PdfShopCollection[] = [];
  try {
    const catalog = await loadSharedCatalogMenu(
      request,
      getCatalogOptions(context),
    );
    collections = catalog.collections.map((c) => ({
      handle: c.handle,
      name: c.name,
    }));
  } catch (error) {
    console.warn('[book] collections fetch failed', error);
  }

  return {
    meta: bookMeta(),
    section,
    html,
    description,
    prev: index > 0 ? (sections[index - 1] ?? null) : null,
    next: index >= 0 && index < sections.length - 1 ? (sections[index + 1] ?? null) : null,
    collections,
  };
}

export default function BookSectionRoute() {
  const data = useLoaderData<typeof loader>();
  return <BookSectionView {...data} />;
}
