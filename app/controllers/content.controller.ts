import type {Storefront} from '@shopify/hydrogen';
import {
  CARE_GUIDE_INTRO,
  CARE_GUIDE_SECTIONS,
  CHAPTERS,
  CRAFT_GALLERY,
  CRAFT_HERO,
  CRAFT_PULL_QUOTE,
  CRAFT_PULL_QUOTE_ATTRIBUTION,
  FAQS,
  HERITAGE_HERO,
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
  STAGES,
  TERMS_INTRO,
  TERMS_SECTIONS,
  type CareGuideSection,
  type CraftStage,
  type FaqItem,
  type HeritageChapter,
  type LegalSection,
} from '~/models/static/content';
import {CONTENT_PAGE_QUERY, SHOP_POLICY_QUERY} from '~/models/shopify/content.queries';
import {parsePageJson} from '~/lib/parse-page-content';
import type {PageMetadata} from '~/controllers/catalog.controller';

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
};

export type CareGuidePageViewModel = {
  intro: string;
  sections: CareGuideSection[];
  metadata: PageMetadata;
};

export type TermsPageViewModel = {
  intro: string;
  sections: LegalSection[];
  metadata: PageMetadata;
  bodyHtml?: string | null;
};

export type PrivacyPageViewModel = {
  intro: string;
  sections: LegalSection[];
  metadata: PageMetadata;
  bodyHtml?: string | null;
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
  const staticPage = {
    intro: TERMS_INTRO,
    sections: TERMS_SECTIONS,
    metadata: {
      title: 'Terms of Service — The Kashmir Weaver',
      description:
        'Terms and conditions governing the sale of hand-woven pashmina by The Kashmir Weaver.',
    },
  };

  if (!storefront) return staticPage;

  try {
    const data = await storefront.query<{
      shop?: {
        termsOfService?: {
          title?: string | null;
          body?: string | null;
        } | null;
      } | null;
    }>(SHOP_POLICY_QUERY, {
      variables: {
        privacyPolicy: false,
        termsOfService: true,
      },
    });

    const policy = data.shop?.termsOfService;
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
  } catch {
    // Fall back to static content
  }

  return staticPage;
}

export async function getPrivacyPage(
  storefront?: Storefront,
): Promise<PrivacyPageViewModel> {
  const staticPage = {
    intro: PRIVACY_INTRO,
    sections: PRIVACY_SECTIONS,
    metadata: {
      title: 'Privacy Policy — The Kashmir Weaver',
      description:
        'How The Kashmir Weaver collects, uses, and protects your personal information.',
    },
  };

  if (!storefront) return staticPage;

  try {
    const data = await storefront.query<{
      shop?: {
        privacyPolicy?: {
          title?: string | null;
          body?: string | null;
        } | null;
      } | null;
    }>(SHOP_POLICY_QUERY, {
      variables: {
        privacyPolicy: true,
        termsOfService: false,
      },
    });

    const policy = data.shop?.privacyPolicy;
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
  } catch {
    // Fall back to static content
  }

  return staticPage;
}
