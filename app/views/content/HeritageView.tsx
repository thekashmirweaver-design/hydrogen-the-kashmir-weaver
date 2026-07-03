import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import type {HeritagePageViewModel} from '~/controllers';

export function HeritageView({hero, chapters}: HeritagePageViewModel) {
  return (
    <div>
      <section className="relative w-full overflow-hidden pt-20">
        <div className="relative aspect-[2752/1536] w-full">
          <img
            src={hero}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover edge-fade-bottom"
            loading="eager"
          />
          <div className="absolute inset-0 vignette-overlay" />
        </div>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1600px] px-6 pb-24 md:px-10">
          <Reveal>
            <Eyebrow>A Documentary</Eyebrow>
            <h1
              className="font-display mt-6 max-w-3xl text-5xl leading-[1.05] md:text-[5.5rem]"
              style={{fontWeight: 300}}
            >
              An unbroken thread,
              <br />
              <span style={{fontStyle: 'italic'}}>six centuries old.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      {chapters.map((c, i) => (
        <section key={c.title} className="py-32 md:py-40">
          <div className="mx-auto grid max-w-[1500px] grid-cols-1 items-center gap-16 px-6 md:grid-cols-2 md:px-10">
            <div className={c.side === 'right' ? 'md:order-2' : 'md:order-1'}>
              <Reveal>
                <div className="w-full overflow-hidden">
                  <img
                    src={c.img}
                    alt={c.title}
                    width={c.width}
                    height={c.height}
                    className="h-auto w-full edge-fade"
                    loading="lazy"
                  />
                </div>
              </Reveal>
            </div>
            <div className={c.side === 'right' ? 'md:order-1' : 'md:order-2'}>
              <Reveal>
                <Eyebrow>{c.eyebrow}</Eyebrow>
                <h2
                  className="font-display mt-6 text-4xl leading-[1.1] md:text-6xl"
                  style={{fontWeight: 400}}
                >
                  {c.title.split(' ')[0]}{' '}
                  <span style={{fontStyle: 'italic'}}>
                    {c.title.split(' ').slice(1).join(' ')}
                  </span>
                </h2>
                <p className="mt-8 max-w-md text-base leading-relaxed text-muted-foreground">
                  {c.body}
                </p>
                <div className="mt-8 text-sm tracking-[0.4em] text-accent">
                  0{i + 1} / 0{chapters.length}
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      ))}

      <section className="mx-auto max-w-[1600px] px-6 py-32 md:px-10">
        <Reveal className="text-center">
          <Eyebrow>The Collections</Eyebrow>
          <h2
            className="font-display mt-6 text-3xl leading-[1.1] md:text-5xl"
            style={{fontWeight: 400}}
          >
            Experience the craft
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground">
            From the Himalayas to your hands — discover every piece born of this unbroken thread.
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
