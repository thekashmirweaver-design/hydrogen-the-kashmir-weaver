import {useLoaderData} from 'react-router';
import type {Route} from './+types/book._index';
import {
  BOOK_PARTS,
  bookMeta,
  bookSectionBody,
  bookSections,
} from '~/lib/book/registry';
import {
  bookLd,
  getStoreUrlFromMatches,
  itemListLd,
  seoBundle,
} from '~/lib/seo';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadSharedCatalogMenu} from '~/lib/shared-catalog';
import type {PdfShopCollection} from '~/workers/book-pdf';
import {BookView} from '~/views/book/BookView';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const title = data?.meta.title ?? 'The Book — The Kashmir Weaver';
  const description =
    'Read The Kashmir Weaver Research Handbook — an in-depth exploration of authentic Kashmiri pashmina, from the high Himalayas to the loom, free online or as a downloadable PDF.';
  const storeUrl = getStoreUrlFromMatches(matches);
  const items = bookSections.map((section) => ({
    name: section.title,
    url: `/book/${section.slug}`,
  }));
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl,
    jsonLd: [
      bookLd({
        name: title,
        description,
        url: location.pathname,
        storeUrl,
      }),
      itemListLd({
        name: title,
        url: location.pathname,
        items,
        storeUrl,
      }),
    ],
  });
};

export async function loader({context, request}: Route.LoaderArgs) {
  const meta = bookMeta();
  const sections = bookSections;
  const frontMatter = sections.filter((s) => s.slug === 'preface');
  const parts = BOOK_PARTS.map((part) => ({
    label: part.label,
    title: part.title,
    sections: part.sectionSlugs
      .map((slug) => sections.find((s) => s.slug === slug))
      .filter((s): s is NonNullable<typeof s> => Boolean(s)),
  }));
  const wordCount = sections.reduce(
    (total, section) =>
      total +
      bookSectionBody(section.slug).split(/\s+/).filter(Boolean).length,
    0,
  );
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
  return {meta, parts, frontMatter, wordCount, collections};
}

export default function BookIndexRoute() {
  const data = useLoaderData<typeof loader>();
  return <BookView {...data} />;
}