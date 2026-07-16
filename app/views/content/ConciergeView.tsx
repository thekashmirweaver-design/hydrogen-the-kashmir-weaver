import {useEffect, useRef, useState} from 'react';
import {Link, useFetcher, useRouteLoaderData} from 'react-router';
import {
  Mail,
  MessageCircle,
  Phone,
  Calendar,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';
import {
  contactMailtoHref,
  contactTelHref,
  contactWhatsappHref,
  resolveContact,
} from '~/lib/contact';
import {CONCIERGE_INQUIRY_TYPES} from '~/lib/webmcp';
import type {RootLoader} from '~/root';

type ContactChannel = {
  icon: LucideIcon;
  label: string;
  detail: string;
  href?: string;
  cta?: string;
  external?: boolean;
};

const INQUIRY_TYPES = CONCIERGE_INQUIRY_TYPES.map((label) => ({
  label,
  description:
    label === 'Custom Orders'
      ? 'Personalise an existing design — colour, size, or monogram.'
      : label === 'Bespoke Pashmina'
        ? 'Commission a one-of-one piece woven to your vision.'
        : label === 'Wedding Gifting'
          ? 'Curated trousseau and bridal-party gifting.'
          : label === 'Corporate Gifting'
            ? 'Branded or bulk gifting for clients and teams.'
            : label === 'Wholesale Inquiries'
              ? 'Stock The Kashmir Weaver in your boutique or store.'
              : label === 'Personal Shopping'
                ? 'One-to-one guidance from our atelier team.'
                : 'Media, partnerships, and editorial requests.',
}));

export function ConciergeView() {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const contact = resolveContact(rootData?.shopSettings?.contact);

  const contactChannels: ContactChannel[] = [
    {
      icon: Mail,
      label: 'Email',
      detail: contact.email,
      href: contactMailtoHref(contact.email),
      cta: 'Send email',
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      detail: contact.whatsapp,
      href: contactWhatsappHref(contact.whatsapp),
      cta: 'Message on WhatsApp',
      external: true,
    },
    {
      icon: Phone,
      label: 'Phone',
      detail: contact.phone,
      href: contactTelHref(contact.phone),
      cta: 'Call now',
    },
    {
      icon: Calendar,
      label: 'Private Appointment',
      detail: 'By invitation',
    },
  ];

  return (
    <div>
      <section className="mx-auto max-w-[1100px] px-6 pt-8 text-center md:px-10">
        <Reveal>
          <Eyebrow>Concierge</Eyebrow>
          <h1
            className="font-display mt-8 text-5xl leading-[1.05] md:text-[5.5rem]"
            style={{fontWeight: 300}}
          >
            How may we
            <br />
            <span style={{fontStyle: 'italic'}}>assist you?</span>
          </h1>
          <p className="mx-auto mt-10 max-w-xl text-base leading-relaxed text-muted-foreground">
            Our team responds personally within 24 hours on business days
            (Monday–Saturday, 10:00–18:00 IST). Every conversation begins with a
            name.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto mt-24 max-w-3xl px-6 md:px-10">
        <Hairline />
        <div className="py-12">
          <InquiryForm />
        </div>
        <Hairline />
      </section>

      <section id="contact" className="mx-auto mt-32 max-w-[1400px] px-6 md:px-10">
        <div className="text-center">
          <Eyebrow>Reach Us Directly</Eyebrow>
          <h2 className="font-display mt-6 text-4xl md:text-5xl" style={{fontWeight: 400}}>
            <span style={{fontStyle: 'italic'}}>Four ways to begin.</span>
          </h2>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-px md:grid-cols-4">
          {contactChannels.map(({icon: Icon, label, detail, href, cta, external}) => (
            <div
              key={label}
              className="border p-10 text-center"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
              }}
            >
              <Icon className="mx-auto h-6 w-6 text-accent" strokeWidth={1} />
              <div className="tracked mt-6 text-foreground">{label}</div>
              {href ? (
                <a
                  href={href}
                  className="mt-3 block text-sm text-muted-foreground transition hover:text-accent"
                  {...(external ? {target: '_blank', rel: 'noreferrer'} : {})}
                >
                  {detail}
                </a>
              ) : (
                <div className="mt-3 text-sm text-muted-foreground">{detail}</div>
              )}
              {href && cta && (
                <a
                  href={href}
                  className="tracked mt-5 inline-block text-xs uppercase tracking-widest text-accent transition hover:opacity-80"
                  {...(external ? {target: '_blank', rel: 'noreferrer'} : {})}
                >
                  {cta}
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-32 max-w-[1400px] px-6 md:px-10">
        <Reveal className="text-center">
          <Eyebrow>The Collections</Eyebrow>
          <h2 className="font-display mt-6 text-3xl md:text-5xl" style={{fontWeight: 400}}>
            Discover every piece
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Explore our complete range of hand-woven Kashmiri pashmina, each crafted by a single
            master artisan.
          </p>
          <div className="mt-10">
            <Link
              to="/collections"
              className="tracked inline-flex w-full items-center justify-center gap-3 px-10 py-4 font-medium transition hover:opacity-90 sm:w-auto"
              style={{background: 'var(--accent)', color: 'var(--background)'}}
            >
              Explore Collections <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function InquiryForm() {
  const [type, setType] = useState<string>(INQUIRY_TYPES[0].label);
  const fetcher = useFetcher<{success?: boolean; errors?: Record<string, string>}>();
  const formRef = useRef<HTMLFormElement>(null);
  const sent = fetcher.data?.success === true;
  const errors = fetcher.data?.errors ?? {};
  const isSubmitting = fetcher.state !== 'idle';

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const onSubmit = (event: Event) => {
      const submitEvent = event as SubmitEvent & {
        agentInvoked?: boolean;
        respondWith?: (promise: Promise<unknown>) => void;
      };
      if (!submitEvent.agentInvoked || !submitEvent.respondWith) return;

      submitEvent.preventDefault();
      const body = new FormData(form);
      const promise = fetch('/api/concierge', {method: 'POST', body})
        .then((response) => response.json())
        .then((data) => {
          const result = data as {success?: boolean; errors?: Record<string, string>};
          if (result.success) {
            return 'Inquiry submitted. Our atelier will respond personally within 24 hours.';
          }
          if (result.errors) {
            return `Validation failed: ${Object.values(result.errors).join(' ')}`;
          }
          return 'Unable to submit inquiry.';
        });

      submitEvent.respondWith(promise);
    };

    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, []);

  if (sent)
    return (
      <div className="text-sm text-accent">
        Thank you. Our atelier will respond personally within 24 hours.
      </div>
    );

  return (
    <fetcher.Form
      ref={formRef}
      method="post"
      action="/api/concierge"
      className="grid grid-cols-1 gap-6 md:grid-cols-2"
      toolname="submit_concierge_inquiry"
      tooldescription="Send a personal inquiry to The Kashmir Weaver atelier for custom orders, bespoke pashmina, wedding or corporate gifting, wholesale, personal shopping, or press."
    >
      <div className="md:col-span-2">
        <label className="block">
          <span className="tracked text-muted-foreground">Type of inquiry</span>
          <select
            name="inquiryType"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
            toolparamdescription="Reason for contacting the atelier."
            className="mt-3 block min-h-11 w-full cursor-pointer appearance-none border-0 border-b bg-transparent py-3 text-base text-foreground outline-none transition focus:border-accent"
            style={{borderBottom: '1px solid var(--border)'}}
          >
            {INQUIRY_TYPES.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {errors.inquiryType && (
          <p className="mt-2 text-xs text-accent">{errors.inquiryType}</p>
        )}
      </div>
      <Field
        label="Your name"
        name="name"
        error={errors.name}
        toolparamdescription="Full name of the inquirer."
      />
      <Field
        label="Email"
        name="email"
        type="email"
        error={errors.email}
        toolparamdescription="Contact email address."
      />
      <Field
        label="Country / City"
        name="location"
        error={errors.location}
        toolparamdescription="Country or city."
      />
      <Field
        label="Phone (optional)"
        name="phone"
        type="tel"
        toolparamdescription="Optional phone number with country code."
      />
      <div className="md:col-span-2">
        <Field
          label="How may we assist you?"
          name="message"
          textarea
          error={errors.message}
          toolparamdescription="Describe how the atelier may assist."
        />
      </div>
      <div className="md:col-span-2">
        {errors.form && (
          <p className="mb-4 text-sm text-accent">{errors.form}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 tracked disabled:opacity-60"
          style={{
            background: 'var(--accent)',
            color: 'var(--background)',
          }}
        >
          {isSubmitting ? 'Sending…' : 'Send Inquiry'}
        </button>
      </div>
    </fetcher.Form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  textarea = false,
  error,
  toolparamdescription,
}: {
  label: string;
  name: string;
  type?: string;
  textarea?: boolean;
  error?: string;
  toolparamdescription?: string;
}) {
  const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {};
  if (type === 'email') {
    inputProps.autoComplete = 'email';
    inputProps.inputMode = 'email';
  } else if (type === 'tel') {
    inputProps.autoComplete = 'tel';
    inputProps.inputMode = 'tel';
  } else if (name === 'name') {
    inputProps.autoComplete = 'name';
  } else if (name === 'location') {
    inputProps.autoComplete = 'address-level2';
  }

  const fieldClass =
    'mt-3 block min-h-11 w-full border-0 border-b bg-transparent py-3 text-base text-foreground outline-none transition focus:border-accent';

  return (
    <label className="block">
      <span className="tracked text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          required
          rows={4}
          toolparamdescription={toolparamdescription}
          className={fieldClass}
          style={{borderBottom: '1px solid var(--border)'}}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={name !== 'phone'}
          toolparamdescription={toolparamdescription}
          className={fieldClass}
          style={{borderBottom: '1px solid var(--border)'}}
          {...inputProps}
        />
      )}
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
    </label>
  );
}
