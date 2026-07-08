import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {EditorialImage} from '~/components/gulriza/CatalogImage';
import {Reveal} from '~/components/gulriza/Reveal';
import {JournalRichHtml} from '~/components/gulriza/JournalRichHtml';
import type {JournalArticle} from '~/models/static/journal';
import {journalEyebrow} from '~/lib/parse-page-content';

export function ArticleView({
  article,
  datePublished,
}: {
  article: JournalArticle;
  datePublished?: string;
}) {
  return (
    <div>
      <section className="relative h-[80dvh] w-full overflow-hidden pt-[calc(var(--header-h)+1rem)]">
        <EditorialImage
          src={article.img}
          alt={article.title}
          className="absolute inset-0 h-full w-full object-cover edge-fade-bottom"
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
        />
        <div className="absolute inset-0 vignette-overlay" />
        <div className="hero-bottom-scrim pointer-events-none absolute inset-0" />
        <div
          className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-[1100px] px-6 md:px-10"
          style={{paddingBottom: 'max(5rem, env(safe-area-inset-bottom))'}}
        >
          <Reveal>
            <Eyebrow className="!text-foreground">
              {journalEyebrow(article.cat, article.minutes, datePublished)}
            </Eyebrow>
            <h1
              className="font-display mt-6 text-5xl leading-[1.05] md:text-[5rem]"
              style={{fontWeight: 300}}
            >
              {article.title.split(' ').slice(0, -1).join(' ')}{' '}
              <span style={{fontStyle: 'italic'}}>
                {article.title.split(' ').slice(-1)[0]}.
              </span>
            </h1>
          </Reveal>
        </div>
      </section>

      <article className="mx-auto max-w-2xl px-6 py-24 md:px-0">
        {article.bodyHtml ? (
          <JournalRichHtml html={article.bodyHtml} />
        ) : (
          (article.body ?? []).map((p, i) => (
            <p
              key={i}
              className="font-display text-xl leading-[1.7] text-foreground/90 first:mt-0 mt-8"
              style={{fontWeight: 300}}
            >
              {i === 0 ? (
                <>
                  <span
                    className="font-display float-left mr-3 text-5xl leading-[0.85] text-accent sm:text-7xl"
                    style={{fontWeight: 400}}
                  >
                    {p[0]}
                  </span>
                  {p.slice(1)}
                </>
              ) : (
                p
              )}
            </p>
          ))
        )}
        <div className="mt-16 border-t pt-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Link to="/journal" className="tracked inline-flex min-h-11 items-center text-muted-foreground hover:text-accent active:opacity-80">
            ← Return to the Journal
          </Link>
          <Link
            to="/collections"
            className="tracked inline-flex min-h-11 items-center gap-3 text-foreground transition hover:text-accent active:opacity-80"
          >
            Explore Collections
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
              style={{borderColor: 'var(--border)'}}
            >
              <ArrowRight className="h-4 w-4" strokeWidth={1} />
            </span>
          </Link>
        </div>
      </article>
    </div>
  );
}
