import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {LegalRichHtml} from '~/components/gulriza/LegalRichHtml';
import {Reveal} from '~/components/gulriza/Reveal';
import type {LegalPageViewModel} from '~/controllers/content.controller';

export function LegalPageView({
  title,
  intro,
  sections,
  bodyHtml,
}: LegalPageViewModel & {title: string}) {
  return (
    <div>
      <section className="mx-auto max-w-[800px] px-6 pt-[calc(var(--header-h)+1.5rem)] pb-24 md:px-10">
        <Reveal>
          <Eyebrow>Legal</Eyebrow>
          <h1
            className="font-display mt-6 text-4xl leading-[1.05] sm:text-5xl md:text-7xl"
            style={{fontWeight: 300}}
          >
            {title}
          </h1>
          {!bodyHtml && (
            <p className="mt-8 text-lg leading-relaxed text-muted-foreground">{intro}</p>
          )}
        </Reveal>

        {bodyHtml ? (
          <LegalRichHtml html={bodyHtml} className="mt-16" />
        ) : (
          <div className="mt-16 space-y-12">
            {sections.map((section) => (
              <Reveal key={section.title}>
                <h2 className="font-display text-2xl" style={{fontWeight: 400}}>
                  {section.title}
                </h2>
                <div className="mt-4 text-muted-foreground leading-relaxed">
                  <p>{section.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        <Reveal className="mt-24 text-center">
          <Link
            to="/collections"
            className="tracked inline-flex items-center gap-3 text-accent transition hover:opacity-80"
          >
            Explore Collections <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
