import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';

import type {CraftPageViewModel} from '~/controllers';

export function CraftView({
  hero,
  stages,
  pullQuote,
  pullQuoteAttribution,
  gallery,
}: CraftPageViewModel) {
  return (
    <div>
      <section className="relative h-dvh w-full overflow-hidden pt-20">
        <img
          src={hero}
          alt="A hand holding raw pashmina cashmere fibres lit by candlelight."
          className="absolute inset-0 h-full w-full object-cover edge-fade-bottom animate-slow-zoom origin-center"
          loading="eager"
        />
        <div className="absolute inset-0 vignette-overlay" />
        <div
          className="absolute inset-x-0 bottom-0 mx-auto max-w-[1600px] px-6 md:px-10"
          style={{paddingBottom: 'max(6rem, env(safe-area-inset-bottom))'}}
        >
          <Reveal>
            <Eyebrow>The Kashmir Weaver Craft</Eyebrow>
            <h1
              className="font-display mt-8 max-w-4xl text-[3rem] leading-[1.05] tracking-tight sm:text-[4rem] md:text-[5.5rem]"
              style={{fontWeight: 300}}
            >
              A journey of purity,
              <br />
              <span style={{fontStyle: 'italic'}}>passion and patience.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-6 py-32 md:py-48 md:px-10">
        <Reveal>
          <Eyebrow>Five Stages, One Pashmina</Eyebrow>
          <h2
            className="font-display mt-8 text-4xl leading-[1.1] tracking-tight md:text-6xl"
            style={{fontWeight: 400}}
          >
            From fleece to finished —
            <br />
            <span style={{fontStyle: 'italic'}}>told in hands.</span>
          </h2>
        </Reveal>

        <div className="mt-24 md:mt-32">
          {stages.map((s) => (
            <Reveal key={s.n}>
              <Hairline />
              <div className="grid grid-cols-1 gap-8 py-12 md:grid-cols-12 md:items-baseline md:py-16">
                <div
                  className="font-display text-2xl text-accent md:col-span-2"
                  style={{fontWeight: 300}}
                >
                  {s.n}.
                </div>
                <div
                  className="font-display text-3xl md:col-span-4 md:text-4xl"
                  style={{fontWeight: 400}}
                >
                  {s.t}
                </div>
                <p className="max-w-lg text-lg leading-relaxed text-muted-foreground md:col-span-6">
                  {s.d}
                </p>
              </div>
            </Reveal>
          ))}
          <Hairline />
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-20 text-center md:px-10 md:py-32">
        <Reveal>
          <p
            className="font-display text-2xl leading-relaxed text-foreground md:text-4xl"
            style={{fontWeight: 300, fontStyle: 'italic'}}
          >
            &ldquo;{pullQuote}&rdquo;
          </p>
          <div className="tracked mt-8 text-xs text-muted-foreground">
            {pullQuoteAttribution}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[1600px] px-6 py-20 md:px-10 md:py-32">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-12 md:gap-8 lg:gap-16">
          <div className="md:col-span-7">
            <Reveal>
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                <img
                  src={gallery.artisan.src}
                  alt={gallery.artisan.alt}
                  className="absolute inset-0 h-full w-full object-cover edge-fade"
                  loading="lazy"
                />
              </div>
            </Reveal>
          </div>
          <div className="md:col-span-5 md:mt-48 lg:mt-64">
            <Reveal delay={150}>
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <img
                  src={gallery.journal.src}
                  alt={gallery.journal.alt}
                  className="absolute inset-0 h-full w-full object-cover edge-fade"
                  loading="lazy"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-6 py-32 md:px-10 md:py-48">
        <Reveal className="text-center">
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
