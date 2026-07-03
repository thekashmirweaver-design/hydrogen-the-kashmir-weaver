import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import type {JournalArticle} from '~/models/static/journal';

export function ArticleView({article}: {article: JournalArticle}) {
  return (
    <div>
      <section className="relative h-[80dvh] w-full overflow-hidden pt-20">
        <img
          src={article.img}
          alt={article.title}
          className="absolute inset-0 h-full w-full object-cover edge-fade-bottom"
          loading="eager"
        />
        <div className="absolute inset-0 vignette-overlay" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1100px] px-6 pb-20 md:px-10">
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
        {article.body.map((p, i) => (
          <p
            key={i}
            className="font-display text-xl leading-[1.7] text-foreground/90 first:mt-0 mt-8"
            style={{fontWeight: 300}}
          >
            {i === 0 ? (
              <>
                <span
                  className="font-display float-left mr-3 text-7xl leading-[0.85] text-accent"
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
        ))}
        <div className="mt-16 border-t pt-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Link to="/journal" className="tracked text-muted-foreground hover:text-accent">
            ← Return to the Journal
          </Link>
          <Link
            to="/collections"
            className="tracked inline-flex items-center gap-3 text-foreground transition hover:text-accent"
          >
            Explore Collections
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
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
