import {CONTACT} from '~/lib/contact';

/**
 * Public business identity — keep identical to Merchant Center, Google Business
 * Profile, Shopify Admin store address, GST records, and Payments profile.
 * Source: GST registered address (Firdous Abad / Batamaloo).
 */
export const BUSINESS = {
  name: 'The Kashmir Weaver',
  /** Same as trading name unless a separate registered entity exists. */
  legalName: 'The Kashmir Weaver',
  /** Line 1 for schema / GMC streetAddress */
  streetAddress:
    'House No. 10A, Lane No. 17, Ground Floor, Firdous Abad Colony, Batmaloo Bypass Road',
  locality: 'Srinagar',
  region: 'Jammu and Kashmir',
  postalCode: '190009',
  country: 'India',
  countryCode: 'IN',
  /** Single canonical string — use this everywhere (site, Shopify, GMC, GBP). */
  fullAddress:
    'House No. 10A, Lane No. 17, Ground Floor, Firdous Abad Colony, Batmaloo Bypass Road, Srinagar, Jammu and Kashmir 190009, India',
  email: CONTACT.email,
  phone: CONTACT.phone,
  /** GSTIN — must match Merchant Center business information exactly. */
  gstin: '01THFPS2915K1ZW',
  /** Customer-service hours shown on About / Concierge (IST). */
  hours: 'Monday–Saturday, 10:00–18:00 IST',
  website: 'https://thekashmirweaver.shop',
} as const;
