import {CONTACT} from '~/lib/contact';

export const BUSINESS = {
  name: 'The Kashmir Weaver',
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
} as const;
