import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import {BookDownloadButton} from './BookDownloadButton';
import {bookChapterNumber} from '~/lib/book/registry';
import type {PdfShopCollection} from '~/workers/book-pdf';
import type {BookMeta, BookSection} from '~/lib/book/types';

export interface BookPartView {
  label: string;
  title: string;
  sections: BookSection[];
}

export function BookView({
  meta,
  parts,
  frontMatter,
  wordCount,
  collections = [],
}: {
  meta: BookMeta;
  parts: BookPartView[];
  frontMatter: BookSection[];
  wordCount: number;
  collections?: PdfShopCollection[];
}) {
  return (
    <div>
      <section className="mx-auto max-w-[900px] px-6 pt-8 pb-20 md:px-10">
        <Reveal>
          <Eyebrow>Research Handbook</Eyebrow>
          <h1
            className="font-display mt-6 text-5xl leading-[1.02] sm:text-6xl md:text-8xl"
            style={{fontWeight: 300}}
          >
            The Kashmir Weaver
            <span className="block italic">Research Handbook</span>
          </h1>
          <p className="font-display mt-8 text-xl italic leading-snug text-muted-foreground md:text-2xl">
            {meta.subtitle}
          </p>
          <p className="mt-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            An in-depth research-based exploration of authentic Kashmiri
            pashmina — the fibre, its journey from the high Himalayas to the
            loom, the artisans who guard its traditions, and the knowledge
            that separates the genuine from the imitation. Prepared
            as a living document, revised as research deepens.
          </p>          <div className="mt-10 flex flex-wrap items-center gap-6">
            <BookDownloadButton collections={collections} />
            <span className="tracked text-sm text-muted-foreground">
              {meta.edition} · {parts.length} parts · {frontMatter.length + parts.reduce((n, p) => n + p.sections.length, 0)} sections · {wordCount.toLocaleString()} words
            </span>
          </div>
        </Reveal>
      </section>

      <Hairline />

      <section className="mx-auto max-w-[900px] px-6 py-20 md:px-10">
        <Reveal>
          <Eyebrow>Contents</Eyebrow>
          <h2
            className="font-display mt-6 text-4xl leading-[1.05] md:text-6xl"
            style={{fontWeight: 300}}
          >
            The Book
          </h2>
        </Reveal>

        {frontMatter.length > 0 && (
          <div className="mt-12 space-y-3">
            {frontMatter.map((section) => (
              <TocRow key={section.slug} section={section} />
            ))}
          </div>
        )}

        <div className="mt-12 space-y-16">
          {parts.map((part) => (
            <div key={part.label}>
              <div className="flex items-baseline gap-4">
                <span className="tracked text-sm uppercase text-muted-foreground">
                  {part.label}
                </span>
                <h3
                  className="font-display text-2xl italic md:text-3xl"
                  style={{fontWeight: 400}}
                >
                  {part.title}
                </h3>
              </div>
              <Hairline className="mt-4" />
              <div className="mt-6 grid gap-x-10 gap-y-3 md:grid-cols-2">
                {part.sections.map((section) => (
                  <TocRow key={section.slug} section={section} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TocRow({section}: {section: BookSection}) {
  return (
    <Link
      to={`/book/${section.slug}`}
      className="group flex items-baseline justify-between gap-6 border-b py-3 transition hover:border-accent"
      style={{borderColor: 'var(--hairline)'}}
    >
      <span className="flex min-w-0 items-baseline gap-4">
        <span className="tracked shrink-0 text-sm text-muted-foreground">
          {section.kind === 'part' ? '' : sectionLabel(section)}
        </span>
        <span
          className="font-display line-clamp-2 text-xl transition group-hover:text-accent"
          style={{fontWeight: 400}}
        >
          {section.title}
        </span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-accent"
        strokeWidth={1}
      />
    </Link>
  );
}

function sectionLabel(section: BookSection): string {
  switch (section.kind) {
    case 'chapter':
    case 'soul':
      return `Ch. ${bookChapterNumber(section)}`;
    case 'appendix':
      return `App. ${section.slug.replace('appendix-', '').toUpperCase()}`;
    default:
      return '';
  }
}
