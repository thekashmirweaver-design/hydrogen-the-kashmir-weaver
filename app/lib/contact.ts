/**
 * Hardcoded fallbacks when Shopify shop metafield `custom.contact` is unset.
 * Prefer editing that metafield in Admin; Concierge and policies resolve via
 * `loadShopSettings` → `resolveContact`.
 */
export const CONTACT = {
  email: 'thekashmirweaver@gmail.com',
  phone: '+91-9796105623',
  whatsapp: '+91-9796105623',
} as const;

export type ContactInfo = {
  email: string;
  phone: string;
  whatsapp: string;
};

export type ContactOverride = Partial<ContactInfo>;

export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, '');
}

export function contactTelHref(phone: string) {
  const digits = phoneDigits(phone);
  return digits ? `tel:+${digits}` : undefined;
}

export function contactMailtoHref(email: string) {
  return `mailto:${email}`;
}

export function contactWhatsappHref(phone: string) {
  const digits = phoneDigits(phone);
  return digits ? `https://wa.me/${digits}` : undefined;
}

export function resolveContact(override?: ContactOverride): ContactInfo {
  return {
    email: override?.email ?? CONTACT.email,
    phone: override?.phone ?? CONTACT.phone,
    whatsapp: override?.whatsapp ?? CONTACT.whatsapp,
  };
}

export const CONTACT_HREFS = {
  email: contactMailtoHref(CONTACT.email),
  phone: contactTelHref(CONTACT.phone)!,
  whatsapp: contactWhatsappHref(CONTACT.whatsapp)!,
} as const;
