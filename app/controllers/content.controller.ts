import type {Storefront} from '@shopify/hydrogen';
import {
  CARE_GUIDE_INTRO,
  CARE_GUIDE_SECTIONS,
  CHAPTERS,
  CRAFT_GALLERY,
  CRAFT_HERO,
  CRAFT_PULL_QUOTE,
  CRAFT_PULL_QUOTE_ATTRIBUTION,
  DISCLAIMER_INTRO,
  DISCLAIMER_SECTIONS,
  FAQS,
  HERITAGE_HERO,
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
  REFUND_INTRO,
  refundSections,
  SHIPPING_INTRO,
  SHIPPING_SECTIONS,
  STAGES,
  TERMS_INTRO,
  termsSections,
  type CareGuideSection,
  type CraftStage,
  type FaqItem,
  type HeritageChapter,
  type LegalSection,
} from '~/models/static/content';
import {
  CONTENT_PAGE_QUERY,
  SHOP_POLICY_QUERY,
  type ShopPolicyName,
} from '~/models/shopify/content.queries';
import {parsePageJson} from '~/lib/parse-page-content';
import type {PageMetadata} from '~/controllers/catalog.controller';
import {resolveContact, type ContactInfo} from '~/lib/contact';
import {loadShopSettings} from '~/lib/shop-settings';

export type HeritagePageViewModel = {
  hero: string;
  chapters: HeritageChapter[];
  metadata: PageMetadata;
};

export type CraftPageViewModel = {
  hero: string;
  stages: CraftStage[];
  pullQuote: string;
  pullQuoteAttribution: string;
  gallery: typeof CRAFT_GALLERY;
  metadata: PageMetadata;
};

export type FaqPageViewModel = {
  faqs: FaqItem[];
  metadata: PageMetadata;
  bodyHtml?: string | null;
};

export type CareGuidePageViewModel = {
  intro: string;
  sections: CareGuideSection[];
  metadata: PageMetadata;
};

export type LegalPageViewModel = {
  intro: string;
  sections: LegalSection[];
  metadata: PageMetadata;
  bodyHtml?: string | null;
};

export type TermsPageViewModel = LegalPageViewModel;
export type PrivacyPageViewModel = LegalPageViewModel;
export type ShippingPageViewModel = LegalPageViewModel;
export type RefundPageViewModel = LegalPageViewModel;
export type DisclaimerPageViewModel = LegalPageViewModel;

export type AboutPageViewModel = {
  metadata: PageMetadata;
  contact: ContactInfo;
};

type ShopifyPage = {
  handle: string;
  title: string;
  body: string;
  seo?: {title?: string | null; description?: string | null} | null;
};

async function loadShopifyPage(
  storefront: Storefront,
  handle: string,
): Promise<ShopifyPage | null> {
  try {
    const data = await storefront.query<{page?: ShopifyPage | null}>(
      CONTENT_PAGE_QUERY,
      {variables: {handle}},
    );
    return data.page ?? null;
  } catch {
    return null;
  }
}

function looksLikeHtml(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body.trim());
}

async function loadShopPolicyBody(
  storefront: Storefront,
  policyName: ShopPolicyName,
): Promise<{title?: string | null; body?: string | null} | null> {
  try {
    const variables = {
      privacyPolicy: policyName === 'privacyPolicy',
      termsOfService: policyName === 'termsOfService',
      shippingPolicy: policyName === 'shippingPolicy',
      refundPolicy: policyName === 'refundPolicy',
    };

    const data = await storefront.query<{
      shop?: Partial<
        Record<
          ShopPolicyName,
          {title?: string | null; body?: string | null} | null
        >
      > | null;
    }>(SHOP_POLICY_QUERY, {variables});

    return data.shop?.[policyName] ?? null;
  } catch {
    return null;
  }
}

async function shopContact(
  storefront?: Storefront,
): Promise<ContactInfo> {
  if (!storefront) return resolveContact();
  try {
    const settings = await loadShopSettings(storefront);
    return resolveContact(settings.contact);
  } catch {
    return resolveContact();
  }
}

async function getShopPolicyPage(
  storefront: Storefront | undefined,
  policyName: ShopPolicyName,
  staticPage: LegalPageViewModel,
): Promise<LegalPageViewModel> {
  if (!storefront) return staticPage;

  const policy = await loadShopPolicyBody(storefront, policyName);
  if (policy?.body) {
    return {
      intro: staticPage.intro,
      sections: staticPage.sections,
      bodyHtml: policy.body,
      metadata: {
        title: policy.title ?? staticPage.metadata.title,
        description: staticPage.metadata.description,
      },
    };
  }

  return staticPage;
}

async function getShopifyHtmlPage(
  storefront: Storefront | undefined,
  handle: string,
  staticPage: LegalPageViewModel,
): Promise<LegalPageViewModel> {
  if (!storefront) return staticPage;

  const page = await loadShopifyPage(storefront, handle);
  if (page?.body && looksLikeHtml(page.body)) {
    return {
      intro: staticPage.intro,
      sections: staticPage.sections,
      bodyHtml: page.body,
      metadata: {
        title: page.seo?.title ?? page.title ?? staticPage.metadata.title,
        description:
          page.seo?.description ?? staticPage.metadata.description,
      },
    };
  }

  return staticPage;
}

export async function getHeritagePage(
  storefront?: Storefront,
): Promise<HeritagePageViewModel> {
  const staticPage = {
    hero: HERITAGE_HERO,
    chapters: CHAPTERS,
    metadata: {
      title: 'Heritage — The Kashmir Weaver',
      description:
        'The Himalayas, the Changthangi goat, the fibre, the artisans, the legacy. A documentary of The Kashmir Weaver.',
    },
  };

  if (!storefront) return staticPage;

  const page = await loadShopifyPage(storefront, 'heritage');
  if (!page) return staticPage;

  const parsed = parsePageJson<{
    hero?: string;
    chapters?: HeritageChapter[];
  }>(page.body);

  if (parsed?.chapters?.length) {
    return {
      hero: parsed.hero ?? HERITAGE_HERO,
      chapters: parsed.chapters,
      metadata: {
        title: page.seo?.title ?? staticPage.metadata.title,
        description: page.seo?.description ?? staticPage.metadata.description,
      },
    };
  }

  return staticPage;
}

export async function getCraftPage(
  storefront?: Storefront,
): Promise<CraftPageViewModel> {
  const staticPage = {
    hero: CRAFT_HERO,
    stages: STAGES,
    pullQuote: CRAFT_PULL_QUOTE,
    pullQuoteAttribution: CRAFT_PULL_QUOTE_ATTRIBUTION,
    gallery: CRAFT_GALLERY,
    metadata: {
      title: 'The Craft — The Kashmir Weaver',
      description:
        'Six weeks, twelve thousand stitches, one master artisan. The craft of pashmina, told in hands.',
    },
  };

  if (!storefront) return staticPage;

  const page = await loadShopifyPage(storefront, 'craft');
  if (!page) return staticPage;

  const parsed = parsePageJson<{
    hero?: string;
    stages?: CraftStage[];
    pullQuote?: string;
    pullQuoteAttribution?: string;
    gallery?: typeof CRAFT_GALLERY;
  }>(page.body);

  if (parsed?.stages?.length) {
    return {
      hero: parsed.hero ?? CRAFT_HERO,
      stages: parsed.stages,
      pullQuote: parsed.pullQuote ?? CRAFT_PULL_QUOTE,
      pullQuoteAttribution:
        parsed.pullQuoteAttribution ?? CRAFT_PULL_QUOTE_ATTRIBUTION,
      gallery: parsed.gallery ?? CRAFT_GALLERY,
      metadata: {
        title: page.seo?.title ?? staticPage.metadata.title,
        description: page.seo?.description ?? staticPage.metadata.description,
      },
    };
  }

  return staticPage;
}

export async function getFaqPage(
  storefront?: Storefront,
): Promise<FaqPageViewModel> {
  const staticPage = {
    faqs: FAQS,
    metadata: {
      title: 'FAQ — The Kashmir Weaver',
      description:
        'Answers on authenticity, shipping, returns, care, bespoke commissions and more — everything you need before bringing home a The Kashmir Weaver pashmina.',
    },
  };

  if (!storefront) return staticPage;

  const page = await loadShopifyPage(storefront, 'faq');
  if (!page) return staticPage;

  const parsed = parsePageJson<{faqs?: FaqItem[]}>(page.body);
  if (parsed?.faqs?.length) {
    return {
      faqs: parsed.faqs,
      metadata: {
        title: page.seo?.title ?? staticPage.metadata.title,
        description: page.seo?.description ?? staticPage.metadata.description,
      },
    };
  }

  if (looksLikeHtml(page.body)) {
    return {
      faqs: [],
      bodyHtml: page.body,
      metadata: {
        title: page.seo?.title ?? page.title ?? staticPage.metadata.title,
        description:
          page.seo?.description ?? staticPage.metadata.description,
      },
    };
  }

  return staticPage;
}

export async function getCareGuidePage(
  storefront?: Storefront,
): Promise<CareGuidePageViewModel> {
  const staticPage = {
    intro: CARE_GUIDE_INTRO,
    sections: CARE_GUIDE_SECTIONS,
    metadata: {
      title: 'Care Guide — The Kashmir Weaver',
      description:
        'A comprehensive guide to caring for your hand-woven pashmina, cashmere, and fine wools.',
    },
  };

  if (!storefront) return staticPage;

  const page = await loadShopifyPage(storefront, 'care-guide');
  if (!page) return staticPage;

  const parsed = parsePageJson<{
    intro?: string;
    sections?: CareGuideSection[];
  }>(page.body);

  if (parsed?.sections?.length) {
    return {
      intro: parsed.intro ?? CARE_GUIDE_INTRO,
      sections: parsed.sections,
      metadata: {
        title: page.seo?.title ?? staticPage.metadata.title,
        description: page.seo?.description ?? staticPage.metadata.description,
      },
    };
  }

  return staticPage;
}

export async function getTermsPage(
  storefront?: Storefront,
): Promise<TermsPageViewModel> {
  const contact = await shopContact(storefront);
  return getShopPolicyPage(storefront, 'termsOfService', {
    intro: TERMS_INTRO,
    sections: termsSections(contact),
    metadata: {
      title: 'Terms of Service — The Kashmir Weaver',
      description:
        'Terms and conditions governing the sale of hand-woven pashmina by The Kashmir Weaver.',
    },
  });
}

export async function getPrivacyPage(
  storefront?: Storefront,
): Promise<PrivacyPageViewModel> {
  return getShopPolicyPage(storefront, 'privacyPolicy', {
    intro: PRIVACY_INTRO,
    sections: PRIVACY_SECTIONS,
    metadata: {
      title: 'Privacy Policy — The Kashmir Weaver',
      description:
        'How The Kashmir Weaver collects, uses, and protects your personal information.',
    },
  });
}

export async function getShippingPage(
  storefront?: Storefront,
): Promise<ShippingPageViewModel> {
  return getShopPolicyPage(storefront, 'shippingPolicy', {
    intro: SHIPPING_INTRO,
    sections: SHIPPING_SECTIONS,
    metadata: {
      title: 'Shipping Policy — The Kashmir Weaver',
      description:
        'How The Kashmir Weaver delivers hand-woven pashmina within India and worldwide.',
    },
  });
}

export async function getRefundPage(
  storefront?: Storefront,
): Promise<RefundPageViewModel> {
  const contact = await shopContact(storefront);
  return getShopPolicyPage(storefront, 'refundPolicy', {
    intro: REFUND_INTRO,
    sections: refundSections(contact),
    metadata: {
      title: 'Returns Policy — The Kashmir Weaver',
      description:
        'Returns, exchanges, and refunds for The Kashmir Weaver orders.',
    },
  });
}

export async function getDisclaimerPage(
  storefront?: Storefront,
): Promise<DisclaimerPageViewModel> {
  return getShopifyHtmlPage(storefront, 'disclaimer', {
    intro: DISCLAIMER_INTRO,
    sections: DISCLAIMER_SECTIONS,
    metadata: {
      title: 'Disclaimer — The Kashmir Weaver',
      description: 'Terms of use and disclaimers for The Kashmir Weaver website.',
    },
  });
}

export async function getAboutPage(
  storefront?: Storefront,
): Promise<AboutPageViewModel> {
  const contact = await shopContact(storefront);
  return {
    contact,
    metadata: {
      title: 'About — The Kashmir Weaver',
      description:
        'The Kashmir Weaver is a Srinagar atelier for hand-woven Kashmiri pashmina. Legal name, studio address, and contact details.',
    },
  };
}
