import {Link} from 'react-router';
import {useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {HorizontalScrollCue} from '~/components/gulriza/HorizontalScrollCue';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {EditorialImage} from '~/components/gulriza/CatalogImage';
import {Reveal} from '~/components/gulriza/Reveal';
import {JOURNAL_CATEGORIES, type JournalPost} from '~/models/static/journal';

export function JournalView({posts}: {posts: JournalPost[]}) {
  const [cat, setCat] = useState('All');
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const list = cat === 'All' ? sorted : sorted.filter((p) => p.cat === cat);
  const [feature, ...rest] = list;

  return (
    <div>
      <section className="mx-auto max-w-[1600px] px-6 pt-[calc(var(--header-h)+1.5rem)] md:px-10">
        <Eyebrow>Journal — Issue 09</Eyebrow>
        <h1
          className="font-display mt-6 text-5xl leading-[1.05] md:text-[5.5rem]"
          style={{fontWeight: 300}}
        >
          Stories of the
          <br />
          <span style={{fontStyle: 'italic'}}>Valley.</span>
        </h1>

        <HorizontalScrollCue
          cueLabel="Swipe"
          className="mt-16 flex items-center gap-x-8 overflow-x-auto border-b pb-6 md:gap-x-10 no-scrollbar"
        >
          {JOURNAL_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className="tracked inline-flex min-h-11 shrink-0 touch-manipulation items-center whitespace-nowrap transition active:opacity-80"
              style={{
                color: c === cat ? 'var(--accent)' : 'var(--foreground)',
                borderBottom: c === cat ? '1px solid var(--accent)' : '1px solid transparent',
                paddingBottom: '0.5rem',
              }}
            >
              {c}
            </button>
          ))}
        </HorizontalScrollCue>
      </section>

      {feature && (
        <section className="mx-auto max-w-[1600px] px-6 py-20 md:px-10">
          <Reveal>
            <Link
              to={`/journal/${feature.slug}`}
              className="grid grid-cols-1 gap-12 md:grid-cols-12 md:items-center lg:items-end"
            >
              <div className="md:col-span-8">
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <EditorialImage
                    src={feature.img}
                    alt={feature.title}
                    className="absolute inset-0 h-full w-full object-cover edge-fade-bottom"
                    loading="eager"
                    fetchPriority="high"
                    sizes="(min-width: 768px) 66vw, 100vw"
                  />
                </div>
              </div>
              <div className="md:col-span-4 md:-mt-8 lg:mt-0">
                <Eyebrow>
                  {feature.cat} · {feature.minutes} min read
                </Eyebrow>
                <h2
                  className="font-display mt-6 text-4xl leading-tight lg:text-5xl"
                  style={{fontWeight: 400}}
                >
                  {feature.title}
                </h2>
                <p className="mt-4 lg:mt-6 text-sm lg:text-base text-muted-foreground">
                  {feature.excerpt}
                </p>
                <div className="tracked mt-6 lg:mt-8 text-accent">Read the story →</div>
              </div>
            </Link>
          </Reveal>
        </section>
      )}

      <section className="mx-auto max-w-[1600px] px-6 py-20 md:px-10">
        <Hairline />
        <div className="mt-20 grid grid-cols-1 gap-x-10 gap-y-20 lg:grid-cols-3">
          {rest.map((p) => (
            <Reveal key={p.slug}>
              <Link
                to={`/journal/${p.slug}`}
                className="group block md:grid md:grid-cols-[1fr_1.2fr] md:gap-x-12 md:items-center lg:block"
              >
                <div className="relative aspect-[4/5] md:aspect-[4/3] lg:aspect-[4/5] w-full overflow-hidden">
                  <EditorialImage
                    src={p.img}
                    alt={p.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[2000ms] group-hover:scale-105 edge-fade-bottom"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                </div>
                <div className="mt-8 md:mt-0 lg:mt-8">
                  <Eyebrow>
                    {p.cat} · {p.minutes} min read
                  </Eyebrow>
                  <h3
                    className="font-display mt-4 text-2xl leading-tight md:text-3xl lg:text-2xl"
                    style={{fontWeight: 400}}
                  >
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground md:text-base lg:text-sm">
                    {p.excerpt}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-6 py-20 md:px-10">
        <Hairline />
        <Reveal className="mt-28 text-center">
          <Eyebrow>The Collections</Eyebrow>
          <h2
            className="font-display mt-6 text-3xl leading-[1.1] md:text-5xl"
            style={{fontWeight: 400}}
          >
            Discover every piece
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground">
            Explore our complete range of hand-woven Kashmiri pashmina, each crafted by a single
            master artisan.
          </p>
          <Link
            to="/collections"
            className="tracked mt-10 inline-flex w-full items-center justify-center gap-3 px-10 py-4 font-medium transition hover:opacity-90 sm:w-auto"
            style={{background: 'var(--accent)', color: 'var(--background)'}}
          >
            Explore Collections <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
