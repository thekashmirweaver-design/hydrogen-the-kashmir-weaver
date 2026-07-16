import {CONTACT} from '~/lib/contact';

/**
 * Public business identity — keep identical to Merchant Center, Google Business
 * Profile, and Payments profile (NAP + legal name). Set `gstin` once registered.
 */
export const BUSINESS = {
  name: 'The Kashmir Weaver',
  /** Same as trading name unless a separate registered entity exists. */
  legalName: 'The Kashmir Weaver',
  streetAddress: 'H 10-A, Firdousa Abad, Batamaloo',
  locality: 'Srinagar',
  region: 'Jammu and Kashmir',
  postalCode: '190009',
  country: 'India',
  countryCode: 'IN',
  fullAddress:
    'H 10-A, Firdousa Abad, Batamaloo, Srinagar, Jammu and Kashmir 190009, India',
  email: CONTACT.email,
  phone: CONTACT.phone,
  /** GSTIN — must match Merchant Center business information exactly. */
  gstin: '01THFPS2915K1ZW',
  /** Customer-service hours shown on About / Concierge (IST). */
  hours: 'Monday–Saturday, 10:00–18:00 IST',
  website: 'https://thekashmirweaver.shop',
} as const;
