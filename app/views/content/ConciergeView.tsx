import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {Mail, MessageCircle, Phone, Calendar, ArrowRight, ChevronDown, Check} from 'lucide-react';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Reveal} from '~/components/gulriza/Reveal';

const INQUIRY_TYPES = [
  {
    label: 'Custom Orders',
    description: 'Personalise an existing design — colour, size, or monogram.',
  },
  {
    label: 'Bespoke Pashmina',
    description: 'Commission a one-of-one piece woven to your vision.',
  },
  {
    label: 'Wedding Gifting',
    description: 'Curated trousseau and bridal-party gifting.',
  },
  {
    label: 'Corporate Gifting',
    description: 'Branded or bulk gifting for clients and teams.',
  },
  {
    label: 'Wholesale Inquiries',
    description: 'Stock The Kashmir Weaver in your boutique or store.',
  },
  {
    label: 'Personal Shopping',
    description: 'One-to-one guidance from our atelier team.',
  },
  {
    label: 'Press & Collaborations',
    description: 'Media, partnerships, and editorial requests.',
  },
];

export function ConciergeView() {
  return (
    <div>
      <section className="mx-auto max-w-[1100px] px-6 pt-40 text-center md:px-10">
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
            Our team responds personally within 24 hours. Every conversation begins with a name.
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
          {[
            {icon: Mail, label: 'Email', detail: 'thekashmirweaver@gmail.com'},
            {icon: MessageCircle, label: 'WhatsApp', detail: '+91 9796105623'},
            {icon: Phone, label: 'Phone', detail: '+91 9796105623'},
            {icon: Calendar, label: 'Private Appointment', detail: 'By invitation'},
          ].map(({icon: Icon, label, detail}) => (
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
              <div className="mt-3 text-sm text-muted-foreground">{detail}</div>
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
  const [type, setType] = useState(INQUIRY_TYPES[0].label);
  const [sent, setSent] = useState(false);

  if (sent)
    return (
      <div className="text-sm text-accent">
        Thank you. Our atelier will respond personally within 24 hours.
      </div>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="grid grid-cols-1 gap-6 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <TypeDropdown value={type} onChange={setType} />
      </div>
      <Field label="Your name" />
      <Field label="Email" type="email" />
      <Field label="Country / City" />
      <Field label="Phone (optional)" type="tel" />
      <div className="md:col-span-2">
        <Field label="How may we assist you?" textarea />
      </div>
      <div className="md:col-span-2">
        <button
          className="w-full py-4 tracked"
          style={{
            background: 'var(--accent)',
            color: 'var(--background)',
          }}
        >
          Send Inquiry
        </button>
      </div>
    </form>
  );
}

function TypeDropdown({value, onChange}: {value: string; onChange: (value: string) => void}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="block">
      <span className="tracked text-muted-foreground">Type of inquiry</span>
      <div ref={wrapRef} className="relative mt-3">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 w-full items-center justify-between gap-3 bg-transparent py-3 text-left text-sm text-foreground outline-none transition"
          style={{
            borderBottom: open ? '1px solid var(--accent)' : '1px solid var(--border)',
          }}
        >
          <span>{value}</span>
          <ChevronDown
            className="h-4 w-4 shrink-0 transition-transform"
            strokeWidth={1}
            style={{transform: open ? 'rotate(180deg)' : undefined}}
          />
        </button>

        {open && (
          <ul
            role="listbox"
            aria-label="Type of inquiry"
            className="absolute left-0 top-[calc(100%+0.375rem)] z-50 max-h-72 w-full overflow-auto border py-1 shadow-2xl"
            style={{background: 'var(--surface)', borderColor: 'var(--border)'}}
          >
            {INQUIRY_TYPES.map((option) => {
              const active = option.label === value;
              return (
                <li key={option.label} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.label);
                      setOpen(false);
                    }}
                    className="group flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition-colors focus:outline-none"
                  >
                    <span className="block">
                      <span
                        className="block text-sm transition-colors group-hover:text-accent group-focus:text-accent"
                        style={{color: active ? 'var(--accent)' : 'var(--foreground)'}}
                      >
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                    {active && (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.25} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  type = 'text',
  textarea = false,
}: {
  label: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="tracked text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          rows={4}
          className="mt-3 block w-full border-0 border-b bg-transparent py-3 text-sm text-foreground outline-none transition focus:border-accent"
          style={{borderBottom: '1px solid var(--border)'}}
        />
      ) : (
        <input
          type={type}
          className="mt-3 block w-full border-0 border-b bg-transparent py-3 text-sm text-foreground outline-none transition focus:border-accent"
          style={{borderBottom: '1px solid var(--border)'}}
        />
      )}
    </label>
  );
}
