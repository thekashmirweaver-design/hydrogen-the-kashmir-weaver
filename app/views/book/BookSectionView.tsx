import {Link} from 'react-router';
import {ArrowLeft, ArrowRight, BookOpen} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import {BookDownloadButton} from './BookDownloadButton';
import {bookSectionLabel} from '~/lib/book/registry';
import type {PdfShopCollection} from '~/workers/book-pdf';
import type {BookMeta, BookSection} from '~/lib/book/types';

export function BookSectionView({
  meta,
  section,
  html,
  prev,
  next,
  collections = [],
}: {
  meta: BookMeta;
  section: BookSection;
  html: string;
  prev: BookSection | null;
  next: BookSection | null;
  collections?: PdfShopCollection[];
}) {
  const label = bookSectionLabel(section);
  const partLabel = section.kind === 'part'
    ? section.slug === 'masters-of-kashmir' ? 'Part IX' : 'Part X'
    : label;

  return (
    <div>
      <section className="mx-auto max-w-[820px] px-6 pt-10 pb-16 md:px-10">
        <Link
          to="/book"
          className="tracked inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-accent"
        >
          <BookOpen className="h-4 w-4" strokeWidth={1.5} />
          {meta.title}
        </Link>

        <Reveal>
          <div className="mt-10 flex flex-wrap items-start justify-between gap-8">
            <div>
              <Eyebrow>{partLabel}</Eyebrow>
              <h1
                className="font-display mt-6 max-w-2xl text-5xl leading-[1.02] md:text-7xl"
                style={{fontWeight: 300}}
              >
                {section.title}
              </h1>
              {section.subtitle ? (
                <p className="font-display mt-6 max-w-xl text-xl italic leading-snug text-muted-foreground md:text-2xl">
                  {section.subtitle}
                </p>
              ) : null}
            </div>
            <BookDownloadButton compact collections={collections} />
          </div>
        </Reveal>
      </section>

      <article className="mx-auto max-w-[760px] px-6 pb-24 md:px-10">
        <div className="book-article-body" dangerouslySetInnerHTML={{__html: html}} />

        <nav className="mt-24 grid gap-6 border-t pt-10 md:grid-cols-2" style={{borderColor: 'var(--hairline)'}}>
          {prev ? (
            <Link
              to={`/book/${prev.slug}`}
              className="tracked group inline-flex min-h-11 items-center gap-3 text-muted-foreground transition hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" strokeWidth={1.5} />
              <span className="min-w-0">
                <span className="block text-xs uppercase opacity-70">Previous</span>
                <span className="font-display line-clamp-2 text-lg normal-case">
                  {bookSectionLabel(prev)} — {prev.title}
                </span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              to={`/book/${next.slug}`}
              className="tracked group inline-flex min-h-11 items-center justify-end gap-3 text-foreground transition hover:text-accent"
            >
              <span className="min-w-0 text-right">
                <span className="block text-xs uppercase opacity-70">Next</span>
                <span className="font-display line-clamp-2 text-lg normal-case">
                  {bookSectionLabel(next)} — {next.title}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </div>
  );
}
