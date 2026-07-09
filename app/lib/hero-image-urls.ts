// Local hero assets under /public/assets.
// Dark = emerald shawl portrait; light = cream/gold shawl portrait.
// Formats: AVIF (best) → WebP → JPG fallback.

export type HeroImageSet = {
  jpg: string;
  jpgSmall: string;
  webp: string;
  webpSmall: string;
  avif: string;
  avifSmall: string;
};

/** Dark-theme homepage hero (default brand portrait). */
export const heroDark: HeroImageSet = {
  jpg: '/assets/hero-portrait.jpg',
  jpgSmall: '/assets/hero-portrait-800.jpg',
  webp: '/assets/hero-portrait.webp',
  webpSmall: '/assets/hero-portrait-800.webp',
  avif: '/assets/hero-portrait.avif',
  avifSmall: '/assets/hero-portrait-800.avif',
};

/** Light-theme homepage hero (cream / gold portrait). */
export const heroLight: HeroImageSet = {
  jpg: '/assets/hero-portrait-light.jpg',
  jpgSmall: '/assets/hero-portrait-light-800.jpg',
  webp: '/assets/hero-portrait-light.webp',
  webpSmall: '/assets/hero-portrait-light-800.webp',
  avif: '/assets/hero-portrait-light.avif',
  avifSmall: '/assets/hero-portrait-light-800.avif',
};

// Back-compat aliases used by preload / older imports.
export const heroImage = heroDark.jpg;
export const heroImage800 = heroDark.jpgSmall;
export const heroImageAvif = heroDark.avif;
export const heroImage800Avif = heroDark.avifSmall;
export const heroImageWebp = heroDark.webp;
export const heroImage800Webp = heroDark.webpSmall;
