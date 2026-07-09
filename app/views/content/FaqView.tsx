import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {Accordion} from '~/components/gulriza/Accordion';
import {LegalRichHtml} from '~/components/gulriza/LegalRichHtml';
import {Reveal} from '~/components/gulriza/Reveal';
import type {FaqPageViewModel} from '~/controllers';

export function FaqView({faqs, bodyHtml}: FaqPageViewModel) {
  return (
    <div>
      <section className="mx-auto max-w-[1100px] px-6 pt-16 text-center md:px-10">
        <Reveal>
          <Eyebrow>Help & Support</Eyebrow>
          <h1
            className="font-display mt-8 text-5xl leading-[1.05] md:text-[5.5rem]"
            style={{fontWeight: 300}}
          >
            Frequently asked
            <br />
            <span style={{fontStyle: 'italic'}}>questions.</span>
          </h1>
          <p className="mx-auto mt-10 max-w-xl text-base leading-relaxed text-muted-foreground">
            Everything you need to know before bringing home a The Kashmir Weaver pashmina — from
            authenticity and care to bespoke commissions. If something remains unanswered, our
            Concierge is always near.
          </p>
        </Reveal>
      </section>

      {bodyHtml ? (
        <section className="mx-auto mt-24 max-w-3xl px-6 md:px-10">
          <LegalRichHtml html={bodyHtml} />
        </section>
      ) : (
        <section className="mx-auto mt-24 max-w-3xl px-6 md:px-10">
          {faqs.map((f, i) => (
            <Reveal key={f.q}>
              <Accordion title={f.q} defaultOpen={i === 0}>
                {f.a}
              </Accordion>
            </Reveal>
          ))}
        </section>
      )}

      <section className="mx-auto max-w-[1100px] px-6 py-32 md:px-10">
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
