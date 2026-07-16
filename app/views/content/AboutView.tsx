import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {Eyebrow} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import type {AboutPageViewModel} from '~/controllers';
import {BUSINESS} from '~/lib/business';
import {
  contactMailtoHref,
  contactTelHref,
} from '~/lib/contact';

export function AboutView({contact}: AboutPageViewModel) {
  const mailto = contactMailtoHref(contact.email);
  const tel = contactTelHref(contact.phone);
  const gstin = BUSINESS.gstin?.trim();

  return (
    <div>
      <section className="mx-auto max-w-[800px] px-6 pt-8 pb-24 md:px-10">
        <Reveal>
          <Eyebrow>Our Atelier</Eyebrow>
          <h1
            className="font-display mt-6 text-4xl leading-[1.05] sm:text-5xl md:text-7xl"
            style={{fontWeight: 300}}
          >
            About{' '}
            <span style={{fontStyle: 'italic'}}>The Kashmir Weaver</span>
          </h1>
          <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
            We are a Srinagar atelier devoted to hand-woven Kashmiri pashmina —
            rare Himalayan fleece, shaped by master artisans in the valley we
            call home.
          </p>
        </Reveal>

        <div className="mt-16 space-y-12">
          <Reveal>
            <h2 className="font-display text-2xl" style={{fontWeight: 400}}>
              Who we are
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {BUSINESS.legalName} is the legal and trading name of our house.
              We sell our own hand-woven Kashmiri pashmina directly to customers
              through this online store — not a marketplace reseller. From our
              studio in Srinagar, we work directly with Kashmiri weavers and
              embroiderers to offer shawls, stoles, and wraps rooted in
              centuries of Himalayan craft — not mass production, but pieces made
              slowly, by hand.
            </p>
          </Reveal>

          <Reveal>
            <h2 className="font-display text-2xl" style={{fontWeight: 400}}>
              Studio address
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {BUSINESS.name}
              <br />
              {BUSINESS.fullAddress}
            </p>
            {gstin ? (
              <p className="mt-4 leading-relaxed text-muted-foreground">
                GSTIN: {gstin}
              </p>
            ) : null}
          </Reveal>

          <Reveal>
            <h2 className="font-display text-2xl" style={{fontWeight: 400}}>
              Contact &amp; support hours
            </h2>
            <div className="mt-4 space-y-2 leading-relaxed text-muted-foreground">
              <p>
                Email:{' '}
                <a href={mailto} className="text-foreground transition hover:text-accent">
                  {contact.email}
                </a>
              </p>
              <p>
                Phone:{' '}
                <a href={tel} className="text-foreground transition hover:text-accent">
                  {contact.phone}
                </a>
              </p>
              <p>Hours: {BUSINESS.hours}</p>
              <p>
                <Link to="/concierge" className="text-accent transition hover:opacity-80">
                  Concierge
                </Link>{' '}
                for bespoke commissions, care, and order support. We aim to
                respond within 24 hours on business days.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <h2 className="font-display text-2xl" style={{fontWeight: 400}}>
              Policies &amp; payments
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Shipping, returns, cancellations, privacy, and terms are published
              on this site and linked in the footer. Payment is taken securely at
              Shopify checkout — methods shown there may include major credit and
              debit cards, UPI, net banking, and other options enabled for your
              region. See{' '}
              <Link to="/shipping" className="text-accent transition hover:opacity-80">
                Shipping
              </Link>
              ,{' '}
              <Link to="/returns" className="text-accent transition hover:opacity-80">
                Returns
              </Link>
              , and{' '}
              <Link to="/cancellation" className="text-accent transition hover:opacity-80">
                Cancellation
              </Link>
              .
            </p>
          </Reveal>

          <Reveal>
            <h2 className="font-display text-2xl" style={{fontWeight: 400}}>
              Heritage &amp; craft
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              To understand how our pieces are made — the Changthangi goat, the
              loom, the embroidery traditions — explore our{' '}
              <Link to="/heritage" className="text-accent transition hover:opacity-80">
                Heritage
              </Link>{' '}
              and{' '}
              <Link to="/craft" className="text-accent transition hover:opacity-80">
                Craft
              </Link>{' '}
              pages.
            </p>
          </Reveal>

          <Reveal>
            <h2 className="font-display text-2xl" style={{fontWeight: 400}}>
              Authenticity &amp; GI certificates
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Where a piece is eligible, Geographical Indication (GI) certificates
              may be available on request. Not every product ships with a
              certificate by default — material composition and provenance are
              stated on each product page and in our product data. Contact
              Concierge if you need documentation for a specific piece.
            </p>
          </Reveal>
        </div>

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
