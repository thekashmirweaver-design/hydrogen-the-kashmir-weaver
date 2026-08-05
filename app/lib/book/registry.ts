import type {BookMeta, BookPart, BookSection} from './types';

import manifestJson from '~/content/book/book-manifest.json';

/**
 * All book section markdown, imported eagerly as raw strings so both the
 * SSR route loaders and the client-side PDF worker can share them.
 */
const rawMarkdown = import.meta.glob('../../content/book/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const manifest = manifestJson as {
  title: string;
  subtitle: string;
  edition: string;
  sections: Array<BookSection>;
};

const sectionsBySlug = new Map(manifest.sections.map((s) => [s.slug, s]));

/** All sections in reading order (as defined by the extraction script). */
export const bookSections: BookSection[] = [...manifest.sections].sort(
  (a, b) => a.order - b.order,
);

export function bookMeta(): BookMeta {
  return {
    title: manifest.title,
    subtitle: manifest.subtitle,
    edition: manifest.edition,
  };
}

export function getBookSection(slug: string): BookSection | undefined {
  return sectionsBySlug.get(slug);
}

/** Raw markdown body of a section, with its YAML frontmatter removed. */
export function bookSectionBody(slug: string): string {
  const key = Object.keys(rawMarkdown).find((k) => k.endsWith(`/${slug}.md`));
  if (!key) return '';
  return rawMarkdown[key].replace(/^---[\s\S]*?---\s*/, '');
}

/**
 * Sequential chapter number in reading order. The thematic regrouping in
 * BOOK_PARTS means the original manuscript numbers no longer run
 * consecutively, so chapters (and the Part X "soul" narrative chapters)
 * are renumbered 1..50 in the order a reader encounters them.
 */
const chapterInOrder = new Map<string, number>();
{
  let seq = 0;
  for (const section of bookSections) {
    if (section.kind === 'chapter' || section.kind === 'soul') {
      seq += 1;
      chapterInOrder.set(section.slug, seq);
    }
  }
}

export function bookChapterNumber(section: BookSection): number {
  return chapterInOrder.get(section.slug) ?? section.number ?? 0;
}

/** Display label like "Chapter 1", "Appendix A" or "Chapter 45". */
export function bookSectionLabel(section: BookSection): string {
  switch (section.kind) {
    case 'chapter':
    case 'soul':
      return `Chapter ${bookChapterNumber(section)}`;
    case 'appendix':
      return `Appendix ${section.slug.replace('appendix-', '').toUpperCase()}`;
    case 'part':
      return section.title;
    case 'acknowledgements':
      return 'Acknowledgements';
    case 'preface':
      return 'Preface';
  }
}

/**
 * The editorial reading structure. Orders follow the manifest (set by the
 * extraction script); this grouping is purely presentational.
 */
export const BOOK_PARTS: BookPart[] = [
  {
    label: 'Part I',
    title: 'Origins',
    sectionSlugs: [
      'chapter-1',
      'chapter-3',
      'chapter-11',
      'chapter-21',
      'chapter-22',
    ],
  },
  {
    label: 'Part II',
    title: 'The Historical Journey',
    sectionSlugs: [
      'chapter-2',
      'chapter-10',
      'chapter-19',
      'chapter-20',
      'chapter-31',
    ],
  },
  {
    label: 'Part III',
    title: 'The Craft',
    sectionSlugs: [
      'chapter-4',
      'chapter-5',
      'chapter-6',
      'chapter-7',
      'chapter-23',
      'chapter-27',
      'chapter-28',
    ],
  },
  {
    label: 'Part IV',
    title: 'The People',
    sectionSlugs: ['chapter-14', 'chapter-15', 'chapter-24', 'chapter-25'],
  },
  {
    label: 'Part V',
    title: 'Art, Motifs & Philosophy',
    sectionSlugs: ['chapter-16', 'chapter-18', 'chapter-30'],
  },
  {
    label: 'Part VI',
    title: "The Collector's Guide",
    sectionSlugs: [
      'chapter-8',
      'chapter-9',
      'chapter-12',
      'chapter-13',
      'chapter-26',
      'chapter-29',
      'chapter-32',
      'chapter-33',
      'chapter-34',
      'chapter-35',
      'chapter-36',
    ],
  },
  {
    label: 'Part VII',
    title: 'The Future of Pashmina',
    sectionSlugs: ['chapter-17', 'chapter-39', 'chapter-40'],
  },
  {
    label: 'Reference',
    title: 'Glossary & Sources',
    sectionSlugs: ['chapter-37', 'chapter-38'],
  },
  {
    label: 'Part IX',
    title: 'The Masters of Kashmir',
    sectionSlugs: ['masters-of-kashmir'],
  },
  {
    label: 'Part X',
    title: 'The Soul of Kashmir',
    sectionSlugs: [
      'soul-of-kashmir',
      'soul-1',
      'soul-2',
      'soul-3',
      'soul-4',
      'soul-5',
      'soul-6',
      'soul-7',
      'soul-8',
      'soul-9',
      'soul-10',
    ],
  },
  {
    label: 'Back Matter',
    title: 'Acknowledgements & Appendices',
    sectionSlugs: [
      'acknowledgements',
      'appendix-a',
      'appendix-b',
      'appendix-c',
      'appendix-d',
    ],
  },
];
