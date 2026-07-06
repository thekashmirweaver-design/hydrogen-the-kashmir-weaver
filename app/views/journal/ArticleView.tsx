import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {EditorialImage} from '~/components/gulriza/CatalogImage';
import {Reveal} from '~/components/gulriza/Reveal';
import type {JournalArticle} from '~/models/static/journal';

export function ArticleView({article}: {article: JournalArticle}) {
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
        <div
          className="absolute inset-x-0 bottom-0 mx-auto max-w-[1100px] px-6 md:px-10"
          style={{paddingBottom: 'max(5rem, env(safe-area-inset-bottom))'}}
        >
          <Reveal>
            <Eyebrow>
              {article.cat} · {article.minutes} min read
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
          <div
            className="journal-article-body font-display text-xl leading-[1.7] text-foreground/90 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-8 [&_blockquote]:border-l [&_blockquote]:border-accent [&_blockquote]:pl-6 [&_blockquote]:italic [&_h2]:mt-12 [&_h2]:text-3xl [&_h3]:mt-10 [&_h3]:text-2xl [&_img]:my-10 [&_img]:w-full [&_li]:my-2 [&_ol]:my-8 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-8 [&_p:first-of-type::first-letter]:float-left [&_p:first-of-type::first-letter]:mr-3 [&_p:first-of-type::first-letter]:font-display [&_p:first-of-type::first-letter]:text-5xl [&_p:first-of-type::first-letter]:leading-[0.85] [&_p:first-of-type::first-letter]:text-accent sm:[&_p:first-of-type::first-letter]:text-7xl [&_strong]:font-medium [&_ul]:my-8 [&_ul]:list-disc [&_ul]:pl-6"
            style={{fontWeight: 300}}
            dangerouslySetInnerHTML={{__html: article.bodyHtml}}
          />
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
