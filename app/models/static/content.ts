import {CONTACT, type ContactInfo} from '~/lib/contact';

const heritageHero = '/assets/heritage-hero.jpg';
const himalayas = '/assets/heritage-1.jpg';
const goat = '/assets/heritage-2.jpg';
const craftImg = '/assets/heritage-3.jpg';
const artisan = '/assets/heritage-4.jpg';
const legacy = '/assets/heritage-5.jpg';
const craftHero = '/assets/craft-hero.png';
const craftArtisan = '/assets/craft-artisan.png';
const craftJournal = '/assets/craft-taleem.png';

const CHAPTER_IMAGE = {width: 1792, height: 2400} as const;

export type HeritageChapter = {
  eyebrow: string;
  title: string;
  body: string;
  img: string;
  width: number;
  height: number;
  side: 'left' | 'right';
};

export type CraftStage = {
  n: string;
  t: string;
  d: string;
};

export type FaqItem = {
  q: string;
  a: string;
};

export type CareGuideSection = {
  label: string;
  body: string;
};

export type LegalSection = {
  title: string;
  body: string;
};

export const HERITAGE_HERO = heritageHero;

export const CHAPTERS: HeritageChapter[] = [
  {
    eyebrow: 'Chapter One',
    title: 'The Himalayas',
    body: 'Five thousand metres above the world. Where air is thin and silence is wide. This is where the fibre is born — not made.',
    img: himalayas,
    ...CHAPTER_IMAGE,
    side: 'left',
  },
  {
    eyebrow: 'Chapter Two',
    title: 'The Changthangi Goat',
    body: 'Through winters of minus forty, the Changthangi grows a second coat — finer than any human-spun thread. Each goat yields eighty grams a year.',
    img: goat,
    ...CHAPTER_IMAGE,
    side: 'right',
  },
  {
    eyebrow: 'Chapter Three',
    title: 'The Fibre',
    body: 'Combed by hand from the underbelly each spring. Washed in mountain rivers. Spun on the wooden charkha, by women who have spun for forty winters.',
    img: craftImg,
    ...CHAPTER_IMAGE,
    side: 'left',
  },
  {
    eyebrow: 'Chapter Four',
    title: 'The Artisans',
    body: 'In Srinagar, a single shawl can pass through three generations of hands. Each name is recorded in the lining. Each hand is honoured.',
    img: artisan,
    ...CHAPTER_IMAGE,
    side: 'right',
  },
  {
    eyebrow: 'Chapter Five',
    title: 'The Legacy',
    body: 'The Kashmir Weaver is the keeper of an unbroken thread — six centuries old. We do not innovate the craft. We protect it.',
    img: legacy,
    ...CHAPTER_IMAGE,
    side: 'left',
  },
];

export const CRAFT_HERO = craftHero;

export const STAGES: CraftStage[] = [
  {n: '01', t: 'Combing', d: 'By hand, by spring, from the underbelly of the goat.'},
  {n: '02', t: 'Spinning', d: 'On the wooden charkha. A single shawl, two hundred hours.'},
  {n: '03', t: 'Weaving', d: 'On the pit-loom. Six weeks. One artisan.'},
  {n: '04', t: 'Embroidery', d: 'Twelve thousand stitches, drawn by needle and lamp.'},
  {n: '05', t: 'Finishing', d: 'Washed in mountain water. Hand-knotted. Signed.'},
];

export const CRAFT_PULL_QUOTE =
  '"The loom does not rush, and neither do we. True luxury is the devotion of time—unmeasured and unbound."';

export const CRAFT_PULL_QUOTE_ATTRIBUTION = 'THE KASHMIR WEAVER ATELIER';

export const CRAFT_GALLERY = {
  artisan: {
    src: craftArtisan,
    alt: 'An elderly artisan weaving at a traditional wooden loom in a dimly lit workshop.',
  },
  journal: {
    src: craftJournal,
    alt: 'Weathered hands holding an aged pattern paper at a weaving loom.',
  },
} as const;

export const FAQS: FaqItem[] = [
  {
    q: 'How do I know my pashmina is authentic?',
    a: 'Every The Kashmir Weaver piece is authentic hand-woven Kashmiri pashmina. A Geographical Indication (GI) tag (GI No. 46) is available on demand — please contact our Concierge to request one for your piece.',
  },
  {
    q: 'How long does shipping take?',
    a: 'In-stock pieces are dispatched within 2–3 business days and arrive in 5–7 working days domestically, or 7–12 working days internationally. Every order ships fully insured and tracked, in our signature presentation box.',
  },
  {
    q: 'What is your returns and exchanges policy?',
    a: 'Ready-to-wear pieces may be returned or exchanged within 14 days of delivery, provided they are unworn and in their original packaging. Bespoke, made-to-order, and Solids (dyed to your selected colour after order) are final sale.',
  },
  {
    q: 'How should I care for and wash my pashmina?',
    a: 'We recommend gentle dry cleaning by a specialist, or careful hand-washing in cold water with a mild wool detergent. Never wring or tumble dry — lay flat in shade to dry, and store folded with cedar to protect the fibre.',
  },
  {
    q: 'Where does your pashmina come from?',
    a: 'Our fibre is combed by hand each spring from the underbelly of the Changthangi goat, which grazes above 4,000 metres in the Ladakh highlands. It is then spun and woven in Srinagar by master artisans, exactly as it has been for six centuries.',
  },
  {
    q: 'Do you offer bespoke or custom commissions?',
    a: 'Yes. Through our Concierge, you may commission a bespoke piece — choosing the weave, palette, embroidery and dimensions. A made-to-order shawl typically takes six to sixteen weeks, depending on the intricacy of the work.',
  },
  {
    q: 'Why are your pieces priced as they are, and how can I pay?',
    a: 'Each shawl reflects hundreds of hours of single-artisan handwork, from spinning on the charkha to hand-knotted finishing. At Shopify secure checkout you may pay with major credit and debit cards, UPI, net banking, and other methods enabled for your region. Interest-free instalments may be available on eligible orders.',
  },
  {
    q: 'Can I cancel my order?',
    a: 'Yes. You may cancel within 24 hours of payment confirmation if the order has not yet been dispatched. The refund is the order amount minus payment gateway fees. See our Returns Policy or contact Concierge with your order number.',
  },
  {
    q: 'What are your customer service hours?',
    a: 'Our Concierge team is available Monday–Saturday, 10:00–18:00 IST by email, phone, and WhatsApp. We aim to respond within 24 hours on business days.',
  },
  {
    q: 'Can I track my order?',
    a: 'Once your piece is dispatched, you will receive an email and SMS with a live tracking link. For any concern in transit, our Concierge team will personally follow your parcel from our atelier to your hands.',
  },
  {
    q: 'Do you offer gift wrapping?',
    a: 'Every order arrives wrapped in our signature presentation box with tissue and a hand-tied ribbon. At checkout you may add a personalised handwritten note, and we can ship directly to your recipient with the invoice omitted.',
  },
  {
    q: 'Is each piece truly one of one?',
    a: 'Yes. Because every shawl is hand-spun, hand-woven and hand-embroidered by a single artisan, no two are ever identical. Each carries the subtle signature of the hands that made it — and is recorded as a one-of-one in our archive.',
  },
];

export const CARE_GUIDE_INTRO =
  'Timeless pieces deserve timeless care. Hand-woven pashmina is a living fibre. Treated with respect, a piece from The Kashmir Weaver is not an heirloom in waiting — it is an heirloom already.';

export const CARE_GUIDE_SECTIONS: CareGuideSection[] = [
  {
    label: 'Storage',
    body: 'Fold, do not hang. Store your pieces in a breathable cotton or muslin pouch. Never use plastic, which traps moisture and causes the fibres to degrade. Fold carefully along the lines of any embroidery to avoid placing unnecessary stress on dense patterns.',
  },
  {
    label: 'Refreshing',
    body: 'It is rarely necessary to wash pure pashmina. Often, simply airing the piece out overnight in a cool, dry place out of direct sunlight will refresh the fibres completely.',
  },
  {
    label: 'Cleaning',
    body: 'Professional dry cleaning is highly recommended, especially for embroidered pieces where the tension and dye of the threads respond differently to moisture. Do not machine wash or bleach. If hand washing a plain piece is unavoidable, use cold water and a specialist cashmere shampoo. Do not wring or twist; press the water out gently between towels and lay flat to dry.',
  },
  {
    label: 'Protection & Pilling',
    body: 'Handle with care as threads can catch on jewelry or sharp objects. As a natural characteristic of fine wool, slight pilling may occur initially. Carefully remove any loose bobbles using a specialized cashmere comb.',
  },
];

export const TERMS_INTRO =
  'These terms govern your use of The Kashmir Weaver website and the purchase of our hand-woven pashmina. By accessing this site or placing an order, you accept these terms in full.';

export const SHIPPING_INTRO =
  'Every piece leaves our Srinagar atelier fully insured and tracked. This policy describes how we deliver hand-woven pashmina worldwide.';

export const SHIPPING_SECTIONS: LegalSection[] = [
  {
    title: 'Order processing',
    body: 'In-stock pieces are prepared for dispatch within 2–4 business days. During peak seasons or for bespoke commissions, processing times may vary.',
  },
  {
    title: 'Delivery within India',
    body: 'Domestic delivery is complimentary on retail orders. Please allow 5–7 working days from dispatch. All orders require a signature on receipt.',
  },
  {
    title: 'International delivery',
    body: 'We ship worldwide via insured courier. Delivery typically takes 7–12 working days from dispatch. Free worldwide shipping applies to retail orders over $200.',
  },
  {
    title: 'Customs and duties',
    body: 'International customers are responsible for import duties and local taxes. Shipping fees are calculated at checkout.',
  },
  {
    title: 'Order cancellation',
    body: 'You may cancel within 24 hours of payment confirmation if not yet dispatched. Approved cancellations are refunded minus payment gateway fees. See our Returns Policy for full details.',
  },
];

export const REFUND_INTRO =
  'We want you to be delighted with every piece. This policy explains returns, exchanges, and refunds for orders placed through our site.';

/** Static refund sections; pass Shopify `custom.contact` via `resolveContact`. */
export function refundSections(
  contact: ContactInfo = CONTACT,
): LegalSection[] {
  return [
    {
      title: 'Returns window',
      body: 'Ready-to-wear pieces may be returned within 14 days of delivery in unworn, original condition with proof of purchase.',
    },
    {
      title: 'Bespoke pieces',
      body: 'Custom, bespoke, and made-to-order commissions are final sale unless defective or materially different from the agreed specification.',
    },
    {
      title: 'Solid Pashmina (Solids category)',
      body: 'Solids are dyed to your selected colour after the order is placed and are final sale — excluded from returns and exchanges unless the material is defective.',
    },
    {
      title: 'Refunds',
      body: 'Approved returns are refunded to the original payment method within 10–15 business days of receipt at our atelier.',
    },
    {
      title: 'Order cancellation',
      body: `You may cancel an order within 24 hours of payment confirmation, provided it has not yet been dispatched. Approved cancellations are refunded minus payment gateway fees (non-refundable). After 24 hours, or once a bespoke piece has entered production, cancellation may no longer be possible. Email ${contact.email} or call ${contact.phone} with your order number.`,
    },
    {
      title: 'Contact',
      body: `Contact Concierge before returning any item: ${contact.email} · ${contact.phone}.`,
    },
  ];
}

/** @deprecated Prefer `refundSections(shopContact)` so email/phone come from Shopify. */
export const REFUND_SECTIONS = refundSections();

export const DISCLAIMER_INTRO =
  'By using The Kashmir Weaver website, you accept the disclaimers set out below.';

export const DISCLAIMER_SECTIONS: LegalSection[] = [
  {
    title: 'Information on this site',
    body: 'All content is for general information only and does not constitute advice. Product variations are inherent to hand craftsmanship.',
  },
  {
    title: 'Limitation of liability',
    body: 'The Kashmir Weaver shall not be liable for indirect or consequential damages arising from use of this site or our products.',
  },
  {
    title: 'Governing law',
    body: 'All use of this site is governed by the laws of Srinagar, Jammu & Kashmir, India.',
  },
];

/** Static terms sections; pass Shopify `custom.contact` via `resolveContact`. */
export function termsSections(
  contact: ContactInfo = CONTACT,
): LegalSection[] {
  return [
    {
      title: '1. General',
      body: 'The Kashmir Weaver ("we", "us", "our") operates this website to offer rare, hand-woven Kashmiri pashmina. All pieces are crafted by master artisans using age-old techniques. By placing an order, you confirm that you are at least 18 years of age and that the information you provide is accurate and complete.',
    },
    {
      title: '2. Orders & Acceptance',
      body: 'Your submission of an order constitutes an offer to purchase. We reserve the right to accept or decline any order for any reason, including stock unavailability, inaccuracies in pricing, or payment issues. Upon acceptance, you will receive a confirmation email. Each piece is unique; slight variations in colour, weave, and finish are inherent to hand craftsmanship and do not constitute defects.',
    },
    {
      title: '3. Pricing & Payment',
      body: 'Prices are shown in the currency displayed at checkout and may change without notice. They are exclusive of applicable taxes and duties unless stated otherwise. We accept major credit and debit cards, UPI, net banking, and other payment methods shown at Shopify secure checkout for your region. Payment is due at the time of purchase. In the event of a pricing error, we will contact you before processing the order.',
    },
    {
      title: '4. Shipping & Delivery',
      body: 'In-stock pieces are dispatched within 2–3 business days. Delivery times are estimates and not guaranteed. Risk of loss passes to you upon delivery. Any customs duties, taxes, or import fees are your responsibility. We are not liable for delays caused by carriers, customs, or events beyond our control.',
    },
    {
      title: '5. Returns & Exchanges',
      body: 'Ready-to-wear pieces may be returned within 14 days of delivery in unworn condition with original packaging. Bespoke, made-to-order, personalised pieces, and Solids (dyed to order) are final sale. Return shipping is the responsibility of the customer unless the item arrived damaged or incorrect. Refunds are processed to the original payment method within 10 business days of receipt.',
    },
    {
      title: '6. Cancellation',
      body: 'You may cancel an order within 24 hours of payment confirmation if it has not yet been dispatched. Approved cancellation refunds are paid to the original payment method minus payment gateway fees (non-refundable). After that window, or once a bespoke piece has entered production, cancellation may no longer be possible. See our Returns Policy for full details.',
    },
    {
      title: '7. Authenticity',
      body: 'Every piece is authentic hand-woven Kashmiri pashmina. A Geographical Indication (GI) tag (GI No. 46) is available on demand. If you have concerns about authenticity, please contact our Concierge team before dispatch.',
    },
    {
      title: '8. Intellectual Property',
      body: 'All content on this site — including text, imagery, design, logos, and product descriptions — is the property of The Kashmir Weaver and is protected by applicable copyright and trademark laws. You may not reproduce, distribute, or use any content without our express written permission.',
    },
    {
      title: '9. Limitation of Liability',
      body: 'To the maximum extent permitted by law, The Kashmir Weaver shall not be liable for any indirect, incidental, or consequential damages arising from the use of this site or the purchase of our products. Our total liability is limited to the amount paid for the product in question.',
    },
    {
      title: '10. Governing Law',
      body: 'These terms are governed by the laws of India. Any disputes arising from these terms or your purchase shall be subject to the exclusive jurisdiction of the courts of Srinagar, Jammu & Kashmir.',
    },
    {
      title: '11. Contact',
      body: `For questions about these terms, please reach out to our Concierge team via email at ${contact.email} or by phone at ${contact.phone}.`,
    },
  ];
}

/** @deprecated Prefer `termsSections(shopContact)` so email/phone come from Shopify. */
export const TERMS_SECTIONS = termsSections();

export const PRIVACY_INTRO =
  'Your privacy matters to us. This policy explains how The Kashmir Weaver collects, processes, and protects your personal information when you visit our site or make a purchase.';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '1. Information We Collect',
    body: 'We collect information you provide directly: your name, email address, shipping address, phone number, and payment details when placing an order or contacting our Concierge. We also collect certain information automatically, including your IP address, browser type, device information, and browsing behaviour on our site through cookies and similar technologies.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your information to process and fulfil orders, communicate with you about your purchase, provide Concierge and bespoke services, improve our site and offerings, and send occasional updates or marketing communications if you have opted in. We do not sell your personal information to third parties.',
  },
  {
    title: '3. Payment Processing',
    body: 'Payment transactions are processed by our secure payment partners. We do not store full credit card numbers on our servers. All payment data is encrypted using industry-standard TLS technology.',
  },
  {
    title: '4. Cookies',
    body: 'Our site uses essential cookies for functionality (such as your shopping bag) and analytics cookies to understand how visitors interact with the site. You may adjust your browser settings to decline cookies, though this may affect certain features of the site.',
  },
  {
    title: '5. Data Sharing',
    body: 'We share your information only with trusted service providers who assist with order fulfilment, payment processing, and shipping — and only to the extent necessary to provide those services. We may disclose information if required by law or to protect our rights.',
  },
  {
    title: '6. Data Retention',
    body: 'We retain your personal information for as long as necessary to fulfil the purposes described in this policy, or as required by law. When no longer needed, your data will be securely deleted or anonymised.',
  },
  {
    title: '7. Your Rights',
    body: 'You have the right to access, correct, or delete your personal information held by us. You may also object to or restrict certain processing activities. To exercise these rights, please contact our Concierge team. We will respond to your request within 30 days.',
  },
  {
    title: '8. Security',
    body: 'We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.',
  },
  {
    title: '9. Updates to This Policy',
    body: 'We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. We encourage you to review this policy periodically.',
  },
  {
    title: '10. Contact',
    body: 'If you have questions about this Privacy Policy or wish to exercise your data rights, please contact our Concierge at /concierge#contact.',
  },
];
