import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import type {CareGuidePageViewModel} from '~/controllers';

export function CareGuideView({intro, sections}: CareGuidePageViewModel) {
  return (
    <div>
      <section className="mx-auto max-w-[800px] px-6 pt-32 pb-24 md:px-10">
        <Reveal>
          <Eyebrow>The Art of Preservation</Eyebrow>
          <h1
            className="font-display mt-6 text-4xl leading-[1.05] sm:text-5xl md:text-7xl"
            style={{fontWeight: 300}}
          >
            Care Guide
          </h1>
          <p className="mt-8 text-lg leading-relaxed text-muted-foreground">{intro}</p>
        </Reveal>

        <Reveal delay={120} className="mt-16">
          <div className="space-y-6 text-muted-foreground leading-relaxed">
            {sections.map((section) => (
              <p key={section.label}>
                <strong>{section.label}:</strong> {section.body}
              </p>
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-24 text-center">
          <Eyebrow className="block">The Collections</Eyebrow>
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
