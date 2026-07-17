import {Link} from "react-router";
import { Hairline } from "./Eyebrow";
import { BrandLockup } from "~/components/gulriza/BrandLockup";
import type {ShopSettings} from "~/lib/shop-settings";
import {
  contactMailtoHref,
  contactTelHref,
  contactWhatsappHref,
} from "~/lib/contact";

const OUR_WORLD_PATHS = ["/about", "/heritage", "/craft", "/journal"] as const;

const OUR_WORLD_LINKS = [
  { to: "/about", label: "About" },
  { to: "/heritage", label: "Heritage" },
  { to: "/craft", label: "Craft" },
  { to: "/journal", label: "Journal" },
] as const;

const CARE_LINKS = [
  { to: "/concierge", label: "Concierge" },
  { to: "/faq", label: "FAQ" },
  { to: "/care-guide", label: "Care Guide" },
  { to: "/shade-cards", label: "Shade Cards" },
] as const;

const LEGAL_LINKS = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/shipping', label: 'Shipping' },
  { to: '/returns', label: 'Returns' },
  { to: '/disclaimer', label: 'Disclaimer' },
] as const;

export function SiteFooter({shopSettings}: {shopSettings?: ShopSettings}) {
  const social = shopSettings?.social ?? {};
  const contact = shopSettings?.contact;
  const mailto = contact?.email ? contactMailtoHref(contact.email) : undefined;
  const tel = contact?.phone ? contactTelHref(contact.phone) : undefined;
  const whatsapp = contact?.whatsapp
    ? contactWhatsappHref(contact.whatsapp)
    : undefined;

  const shopLinks = [
    { to: "/collections/all", label: "All Products" },
    { to: "/collections", label: "All Collections" },
  ];

  const ourWorldLinks =
    shopSettings?.footerMenu?.length &&
    shopSettings.footerMenu.some((item) =>
      OUR_WORLD_PATHS.includes(item.to as (typeof OUR_WORLD_PATHS)[number]),
    )
      ? shopSettings.footerMenu.filter((item) =>
          OUR_WORLD_PATHS.includes(item.to as (typeof OUR_WORLD_PATHS)[number]),
        )
      : [...OUR_WORLD_LINKS];

  return (
    <footer className="mt-32 pt-20" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-[1600px] px-6 md:px-10">
        <Hairline />
        <div className="grid grid-cols-2 gap-12 py-20 md:grid-cols-6">
          <div className="col-span-2 md:col-span-2">
            <Link to="/" className="group inline-block">
              <BrandLockup className="text-left text-[1.75rem] tracking-[0.12em] md:text-[2rem] md:tracking-[0.15em]" />
            </Link>
            <p
              className="mt-8 max-w-sm font-display text-xl leading-snug md:text-2xl"
              style={{ fontStyle: "italic", fontWeight: 300 }}
            >
              Timeless by nature. <br /> Woven by heritage.
            </p>
            <div className="mt-8 space-y-2 text-sm text-muted-foreground">
              <Link
                to="/concierge#contact"
                className="tracked inline-block transition hover:text-accent"
              >
                Contact Us
              </Link>
              {contact?.email && mailto ? (
                <a
                  href={mailto}
                  className="block transition hover:text-accent"
                >
                  {contact.email}
                </a>
              ) : null}
              {contact?.whatsapp && whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="block transition hover:text-accent"
                >
                  WhatsApp {contact.whatsapp}
                </a>
              ) : null}
              {contact?.phone && tel ? (
                <a href={tel} className="block transition hover:text-accent">
                  {contact.phone}
                </a>
              ) : null}
            </div>
          </div>

          <FootCol title="Shop" links={shopLinks} />
          <FootCol title="Our World" links={ourWorldLinks} />
          <FootCol title="Care" links={[...CARE_LINKS]} />
          <FootCol title="Legal" links={[...LEGAL_LINKS]} />
        </div>

        <Hairline />
        <div className="flex flex-col items-center gap-6 py-8 md:flex-row md:justify-between">
          <div className="flex items-center justify-center gap-5 text-muted-foreground md:justify-start">
            {social.instagram && (
              <a href={social.instagram} aria-label="Instagram" target="_blank" rel="noreferrer">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.073.321 18.2002.1197 16.9229.0645 15.6456.0093 15.2347-.0014 11.9764.0048 8.718.011 8.31.0252 7.0301.084m.1409 21.6932c-1.1703-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.0577-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.0508-1.169.2461-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.4231-.1651 1.0573-.3614 2.2272-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2452 2.228.408.5608.216.96.4762 1.3816.8954.4216.4192.6816.8174.9012 1.3787.1655.4217.3617 1.0556.4169 2.2257.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.4191.4215-.8181.6816-1.3783.9003-.4226.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.8477-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0048a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0048" />
                </svg>
              </a>
            )}

            {social.facebook && (
              <a href={social.facebook} aria-label="Facebook" target="_blank" rel="noreferrer">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
                </svg>
              </a>
            )}

            {social.pinterest && (
              <a href={social.pinterest} aria-label="Pinterest" target="_blank" rel="noreferrer">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.441.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
                </svg>
              </a>
            )}
          </div>
          <p className="text-center text-[0.65rem] uppercase tracking-widest text-muted-foreground md:text-xs">
            © 2026 The Kashmir Weaver
          </p>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <div className="tracked text-accent">{title}</div>
      <ul className="mt-6 space-y-3">
        {links.map((l) => (
          <li key={`${l.to}-${l.label}`}>
            <Link to={l.to} className="text-sm text-foreground/85 transition hover:text-accent">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
