import type {Storefront} from '@shopify/hydrogen';
import {resolveContact} from '~/lib/contact';
import {HEADER_QUERY, FOOTER_QUERY} from '~/lib/fragments';

export type NavItem = {
  to: string;
  label: string;
};

export type ShopContact = {
  email?: string;
  phone?: string;
  whatsapp?: string;
};

export type ShopSocial = {
  instagram?: string;
  facebook?: string;
  pinterest?: string;
  youtube?: string;
};

export type ShopSettings = {
  marquee: string[];
  contact: ShopContact;
  social: ShopSocial;
  headerMenu: NavItem[];
  footerMenu: NavItem[];
};

const DEFAULT_MARQUEE = [
  'Authentic Kashmiri Pashmina',
  'Handcrafted by Artisans',
  'Free Worldwide Shipping Over $200',
  'Certificate of Authenticity Included',
];

const SHOP_SETTINGS_QUERY = `#graphql
  query ShopSettings(
    $country: CountryCode
    $language: LanguageCode
    $headerMenuHandle: String!
    $footerMenuHandle: String!
  ) @inContext(language: $language, country: $country) {
    shop {
      marquee: metafield(namespace: "custom", key: "marquee_messages") {
        value
      }
      contact: metafield(namespace: "custom", key: "contact") {
        value
      }
      social: metafield(namespace: "custom", key: "social") {
        value
      }
      primaryDomain {
        url
      }
    }
    headerMenu: menu(handle: $headerMenuHandle) {
      id
      items {
        id
        title
        url
        type
      }
    }
    footerMenu: menu(handle: $footerMenuHandle) {
      id
      items {
        id
        title
        url
        type
      }
    }
  }
` as const;

type ShopSettingsQueryResult = {
  shop?: {
    marquee?: {value?: string | null} | null;
    contact?: {value?: string | null} | null;
    social?: {value?: string | null} | null;
    primaryDomain?: {url?: string | null} | null;
  } | null;
  headerMenu?: {
    items?: Array<{title?: string | null; url?: string | null} | null> | null;
  } | null;
  footerMenu?: {
    items?: Array<{title?: string | null; url?: string | null} | null> | null;
  } | null;
};

function parseJsonField<T>(value: string | null | undefined): T | null {
  if (!value?.trim()) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeMenuUrl(
  url: string | null | undefined,
  primaryDomainUrl?: string | null,
): string | null {
  if (!url) return null;
  if (url.startsWith('/')) return url;

  try {
    const parsed = new URL(url);
    if (primaryDomainUrl) {
      const domain = new URL(primaryDomainUrl);
      if (
        parsed.hostname === domain.hostname ||
        parsed.hostname === `www.${domain.hostname}` ||
        parsed.hostname.endsWith('.myshopify.com') ||
        parsed.hostname.endsWith('.myshopify.dev')
      ) {
        return parsed.pathname + parsed.search + parsed.hash;
      }
    }
    if (
      parsed.hostname.endsWith('.myshopify.com') ||
      parsed.hostname.endsWith('.myshopify.dev')
    ) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    return url;
  }

  return url;
}

function mapMenuItems(
  items: Array<{title?: string | null; url?: string | null} | null> | null | undefined,
  primaryDomainUrl?: string | null,
): NavItem[] {
  if (!items?.length) return [];

  return items
    .map((item) => {
      const to = normalizeMenuUrl(item?.url, primaryDomainUrl);
      const label = item?.title?.trim();
      if (!to || !label) return null;
      return {to, label};
    })
    .filter((item): item is NavItem => item !== null);
}

export async function loadShopSettings(
  storefront: Storefront,
  options?: {
    headerMenuHandle?: string;
    footerMenuHandle?: string;
    publicStoreDomain?: string;
  },
): Promise<ShopSettings> {
  const headerMenuHandle = options?.headerMenuHandle ?? 'header-menu';
  const footerMenuHandle = options?.footerMenuHandle ?? 'footer-menu';

  try {
    const data = await storefront.query<ShopSettingsQueryResult>(SHOP_SETTINGS_QUERY, {
      variables: {
        headerMenuHandle,
        footerMenuHandle,
      },
      cache: storefront.CacheLong(),
    });

    const primaryDomainUrl = data.shop?.primaryDomain?.url ?? null;
    const marqueeParsed = parseJsonField<string[]>(data.shop?.marquee?.value ?? undefined);
    const contactParsed = parseJsonField<ShopContact>(data.shop?.contact?.value ?? undefined);
    const socialParsed = parseJsonField<ShopSocial>(data.shop?.social?.value ?? undefined);

    const headerMenu = mapMenuItems(data.headerMenu?.items, primaryDomainUrl);
    const footerMenu = mapMenuItems(data.footerMenu?.items, primaryDomainUrl);

    if (
      marqueeParsed?.length ||
      contactParsed ||
      socialParsed ||
      headerMenu.length ||
      footerMenu.length
    ) {
      return {
        marquee: marqueeParsed?.length ? marqueeParsed : DEFAULT_MARQUEE,
        contact: resolveContact(contactParsed ?? {}),
        social: socialParsed ?? {},
        headerMenu,
        footerMenu,
      };
    }
  } catch {
    // Fall through to menu-only or default fallback
  }

  try {
    const [headerData, footerData] = await Promise.all([
      storefront.query<{menu?: ShopSettingsQueryResult['headerMenu']}>(HEADER_QUERY, {
        variables: {headerMenuHandle},
        cache: storefront.CacheLong(),
      }),
      storefront.query<{menu?: ShopSettingsQueryResult['footerMenu']}>(FOOTER_QUERY, {
        variables: {footerMenuHandle},
        cache: storefront.CacheLong(),
      }),
    ]);

    const headerMenu = mapMenuItems(headerData.menu?.items);
    const footerMenu = mapMenuItems(footerData.menu?.items);

    if (headerMenu.length || footerMenu.length) {
      return {
        marquee: DEFAULT_MARQUEE,
        contact: resolveContact(),
        social: {},
        headerMenu,
        footerMenu,
      };
    }
  } catch {
    // Use static defaults
  }

  return {
    marquee: DEFAULT_MARQUEE,
    contact: resolveContact(),
    social: {},
    headerMenu: [],
    footerMenu: [],
  };
}

export {DEFAULT_MARQUEE};
