import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import type {Collection} from '~/models/types';

export function CollectionsView({
  collections,
  productCountByHandle,
}: {
  collections: Collection[];
  productCountByHandle: Record<string, number>;
}) {
  return (
    <div>
      <section className="mx-auto max-w-[1600px] px-6 pt-32 pb-12 md:px-10">
        <Reveal>
          <Eyebrow>The Collections</Eyebrow>
          <h1
            className="font-display mt-6 text-4xl leading-[1.05] sm:text-5xl md:text-7xl"
            style={{fontWeight: 300}}
          >
            A house of
            <br />
            <span style={{fontStyle: 'italic'}}>quiet luxury.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Three signature collections. Each a different language of the same fibre — hand-woven,
            hand-finished, never repeated.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[1600px] px-6 py-12 md:px-10">
        <Hairline />
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c, i) => (
              <Reveal key={c.handle} delay={i * 120}>
                <Link
                  to={`/collections/${c.handle}`}
                  className="group relative block aspect-[3/4] overflow-hidden"
                >
                  <img
                    src={c.hero.src}
                    alt={c.hero.alt}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(8,16,15,0.95) 0%, rgba(8,16,15,0.35) 45%, transparent 70%)',
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-8">
                    <div className="font-display text-2xl leading-tight md:text-3xl">{c.name}</div>
                    <div
                      className="mt-3 text-sm text-muted-foreground"
                      style={{fontStyle: 'italic'}}
                    >
                      {c.tagline}
                    </div>
                    <div className="mt-6 flex w-max items-center gap-3 rounded-full border border-accent/40 bg-accent/5 px-5 py-2.5 text-[0.65rem] md:text-xs tracking-widest text-accent uppercase font-medium transition-all duration-300 lg:border-transparent lg:bg-transparent lg:px-0 lg:py-0 lg:opacity-0 lg:transform lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 lg:group-hover:border-transparent lg:group-hover:bg-transparent">
                      Explore Collection <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              </Reveal>
          ))}
        </div>

        <Hairline className="mt-24" />
        <Reveal className="mt-28 text-center">
          <Link
            to="/collections/all"
            className="tracked inline-flex w-full items-center justify-center gap-3 px-10 py-4 font-medium transition hover:opacity-90 sm:w-auto"
            style={{background: 'var(--accent)', color: 'var(--background)'}}
          >
            Shop All Pieces <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
