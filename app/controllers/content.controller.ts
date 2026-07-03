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
import type {PageMetadata} from '~/controllers/catalog.controller';

export type HeritagePageViewModel = {
  hero: string;
  chapters: HeritageChapter[];
  metadata: PageMetadata;
};

export function getHeritagePage(): HeritagePageViewModel {
  return {
    hero: HERITAGE_HERO,
    chapters: CHAPTERS,
    metadata: {
      title: 'Heritage — The Kashmir Weaver',
      description:
        'The Himalayas, the Changthangi goat, the fibre, the artisans, the legacy. A documentary of The Kashmir Weaver.',
    },
  };
}

export type CraftPageViewModel = {
  hero: string;
  stages: CraftStage[];
  pullQuote: string;
  pullQuoteAttribution: string;
  gallery: typeof CRAFT_GALLERY;
  metadata: PageMetadata;
};

export function getCraftPage(): CraftPageViewModel {
  return {
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
}

export type FaqPageViewModel = {
  faqs: FaqItem[];
  metadata: PageMetadata;
};

export function getFaqPage(): FaqPageViewModel {
  return {
    faqs: FAQS,
    metadata: {
      title: 'FAQ — The Kashmir Weaver',
      description:
        'Answers on authenticity, shipping, returns, care, bespoke commissions and more — everything you need before bringing home a The Kashmir Weaver pashmina.',
    },
  };
}

export type CareGuidePageViewModel = {
  intro: string;
  sections: CareGuideSection[];
  metadata: PageMetadata;
};

export function getCareGuidePage(): CareGuidePageViewModel {
  return {
    intro: CARE_GUIDE_INTRO,
    sections: CARE_GUIDE_SECTIONS,
    metadata: {
      title: 'Care Guide — The Kashmir Weaver',
      description:
        'A comprehensive guide to caring for your hand-woven pashmina, cashmere, and fine wools.',
    },
  };
}

export type TermsPageViewModel = {
  intro: string;
  sections: LegalSection[];
  metadata: PageMetadata;
};

export function getTermsPage(): TermsPageViewModel {
  return {
    intro: TERMS_INTRO,
    sections: TERMS_SECTIONS,
    metadata: {
      title: 'Terms of Service — The Kashmir Weaver',
      description:
        'Terms and conditions governing the sale of hand-woven pashmina by The Kashmir Weaver.',
    },
  };
}

export type PrivacyPageViewModel = {
  intro: string;
  sections: LegalSection[];
  metadata: PageMetadata;
};

export function getPrivacyPage(): PrivacyPageViewModel {
  return {
    intro: PRIVACY_INTRO,
    sections: PRIVACY_SECTIONS,
    metadata: {
      title: 'Privacy Policy — The Kashmir Weaver',
      description:
        'How The Kashmir Weaver collects, uses, and protects your personal information.',
    },
  };
}
