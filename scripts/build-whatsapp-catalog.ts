/**
 * Generate scripts/data/whatsapp-batch-catalog.json from product specs.
 * Run: npx tsx scripts/build-whatsapp-catalog.ts
 */
import {writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const FX = 95.31;
const SELL_MULTIPLIER = 1.85;
const IMG_DIR =
  '/Users/iambqc/Downloads/WhatsApp Unknown 2026-08-12 at 18.22.07';

type Cat = 'Sozni' | 'Kani' | 'Reversible';

type Spec = {
  index: number;
  cat: Cat;
  costInr: number;
  name: string;
  pattern: string;
  colors: string;
  googleColor: string;
  colorLabels: string[];
  includeFloral: boolean;
  extraTags?: string[];
};

const costUsd = (inr: number) =>
  (Math.round((inr / FX) * 100) / 100).toFixed(2);

const sellUsd = (cost: number) =>
  String(Math.floor((cost * SELL_MULTIPLIER) / 10) * 10) + '.00';

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** SEO slug: {pattern}-{craft}-pashmina-shawl-kashmir (dedupes craft in name). */
function seoHandle(spec: Spec): string {
  const craft = spec.cat.toLowerCase();
  let base = slug(spec.name);
  const craftSuffix = `-${craft}`;
  if (base.endsWith(craftSuffix)) {
    base = base.slice(0, -craftSuffix.length);
  }
  return `${base}-${craft}-pashmina-shawl-kashmir`;
}

const collectionFor = (cat: Cat) =>
  cat === 'Sozni' ? 'sozni' : cat === 'Kani' ? 'kani' : 'reversible';

const skuCounters: Record<Cat, number> = {Sozni: 401, Kani: 401, Reversible: 401};

function nextSku(cat: Cat) {
  const n = skuCounters[cat]++;
  const prefix =
    cat === 'Sozni' ? 'SOZ' : cat === 'Kani' ? 'KANI' : 'REV';
  return `TKW-${prefix}-${n}-M`;
}

function buildDescription(spec: Spec): string {
  const craft =
    spec.cat === 'Kani'
      ? 'Kani Pashmina Shawl'
      : spec.cat === 'Reversible'
        ? 'Reversible Pashmina Shawl'
        : 'Sozni Embroidered Cashmere Pashmina Shawl';
  const technique =
    spec.cat === 'Kani'
      ? 'Authentic Kani twill-tapestry weaving'
      : spec.cat === 'Reversible'
        ? 'Handwoven reversible double-face construction'
        : 'Fine Kashmiri Sozni embroidery';

  return `<h2>${craft}</h2>
<p>Experience authentic Kashmiri craftsmanship with this <strong>${craft}</strong>. Created with ${technique.toLowerCase()} on pure Himalayan Pashmina.</p>
<p>${spec.pattern}. Key colours: <strong>${spec.colors}</strong>.</p>

<p>Soft, lightweight, and naturally warm — an heirloom piece for everyday luxury and gifting.</p>
<hr>
<h2>Highlights</h2>
<ul>
<li>${technique}</li>
<li>100% Pure Himalayan Pashmina (Cashmere)</li>
<li>${spec.pattern}</li>
<li>Lightweight yet warm; exceptionally soft</li>
<li>Hand-finished fringe</li>
<li>Ethically handcrafted in Kashmir</li>
</ul>
<h2>Specifications</h2>
<ul>
<li><strong>Material:</strong> 100% Pure Pashmina (Cashmere)</li>
<li><strong>Craft:</strong> ${spec.cat}</li>
<li><strong>Pattern:</strong> ${spec.pattern}</li>
<li><strong>Color:</strong> ${spec.colors}</li>
<li><strong>Origin:</strong> Kashmir, India</li>
<li><strong>Care:</strong> Dry Clean Only</li>
</ul>`;
}

const SPECS: Spec[] = [
  {
    index: 1,
    cat: 'Sozni',
    costInr: 120_000,
    name: 'Orange Paisley Jamawar Sozni',
    pattern: 'Dense all-over paisley and floral jamawar with vertical vine borders',
    colors: 'Orange, Red, Teal, Cream',
    googleColor: 'Multicolor',
    colorLabels: ['Orange', 'Red', 'Blue'],
    includeFloral: true,
    extraTags: ['jamawar'],
  },
  {
    index: 2,
    cat: 'Sozni',
    costInr: 43_000,
    name: 'Grey Chinar Leaf Border Sozni',
    pattern: 'Scattered chinar leaf sprigs with wide terracotta and green border bands',
    colors: 'Grey, Terracotta, Green, Gold',
    googleColor: 'Gray',
    colorLabels: ['Gray', 'Orange', 'Green'],
    includeFloral: true,
  },
  {
    index: 3,
    cat: 'Sozni',
    costInr: 40_000,
    name: 'Cream Floral Bouquet Sozni',
    pattern: 'Large floral bouquet motifs with multicolour vine border',
    colors: 'Cream, Magenta, Orange, Teal',
    googleColor: 'Beige',
    colorLabels: ['Beige', 'Pink', 'Orange'],
    includeFloral: true,
  },
  {
    index: 4,
    cat: 'Sozni',
    costInr: 38_000,
    name: 'Cream Pink Orange Booti Sozni',
    pattern: 'Scattered pink, orange and yellow floral bootis with gold trim border',
    colors: 'Cream, Pink, Orange, Yellow',
    googleColor: 'Beige',
    colorLabels: ['Beige', 'Pink', 'Orange'],
    includeFloral: true,
  },
  {
    index: 5,
    cat: 'Reversible',
    costInr: 28_000,
    name: 'Dusty Pink Charcoal Reversible',
    pattern: 'Plain double-face weave — dusty rose on one side, charcoal on the other',
    colors: 'Dusty Pink, Charcoal',
    googleColor: 'Pink',
    colorLabels: ['Pink', 'Gray'],
    includeFloral: false,
    extraTags: ['reversible', 'reversible-pashmina', 'double-face'],
  },
  {
    index: 6,
    cat: 'Sozni',
    costInr: 43_000,
    name: 'Red Blue Plaid Booti Sozni',
    pattern: 'Large red and navy plaid checks with white floral booti embroidery',
    colors: 'Red, Navy, White, Gold',
    googleColor: 'Multicolor',
    colorLabels: ['Red', 'Blue', 'White'],
    includeFloral: true,
  },
  {
    index: 7,
    cat: 'Sozni',
    costInr: 48_000,
    name: 'Black White Floral Jaal Sozni',
    pattern: 'All-over white floral vine jaal on black ground with border band',
    colors: 'Black, White',
    googleColor: 'Black',
    colorLabels: ['Black', 'White'],
    includeFloral: true,
  },
  {
    index: 8,
    cat: 'Kani',
    costInr: 33_000,
    name: 'Maroon Stripe Floral Border Kani',
    pattern: 'Fine maroon pinstripe body with multicolour floral and block border band',
    colors: 'Maroon, Black, Pink, Green, Yellow',
    googleColor: 'Red',
    colorLabels: ['Red', 'Black', 'Green'],
    includeFloral: true,
  },
  {
    index: 9,
    cat: 'Sozni',
    costInr: 28_000,
    name: 'Mustard Floral Border Sozni',
    pattern: 'Solid mustard ground with multicolour floral vine border and fringe',
    colors: 'Mustard, Pink, Blue, Green',
    googleColor: 'Yellow',
    colorLabels: ['Yellow', 'Pink', 'Blue'],
    includeFloral: true,
  },
  {
    index: 10,
    cat: 'Kani',
    costInr: 28_000,
    name: 'Rose Stripe Floral Border Kani',
    pattern: 'Heathered rose and charcoal stripe body with pink floral border band',
    colors: 'Rose, Charcoal, Pink, Turquoise',
    googleColor: 'Pink',
    colorLabels: ['Pink', 'Gray', 'Green'],
    includeFloral: true,
  },
  {
    index: 11,
    cat: 'Sozni',
    costInr: 120_000,
    name: 'Maroon Dense Floral Jamawar Sozni',
    pattern: 'All-over maroon jamawar with large peony florals and berry sprigs',
    colors: 'Maroon, Peach, Lavender, Teal',
    googleColor: 'Red',
    colorLabels: ['Red', 'Pink', 'Blue'],
    includeFloral: true,
    extraTags: ['jamawar'],
  },
  {
    index: 12,
    cat: 'Sozni',
    costInr: 120_000,
    name: 'Multicolor Paisley Jamawar Sozni',
    pattern: 'Full-surface jamawar with paisley, floral and vine motifs in jewel tones',
    colors: 'Pink, Yellow, Teal, Purple, Cream',
    googleColor: 'Multicolor',
    colorLabels: ['Pink', 'Yellow', 'Blue'],
    includeFloral: true,
    extraTags: ['jamawar'],
  },
  {
    index: 13,
    cat: 'Kani',
    costInr: 30_000,
    name: 'Red Check Floral Border Kani',
    pattern: 'Red and black check body with pink floral and paisley border band',
    colors: 'Red, Black, Pink, Blue, Green',
    googleColor: 'Red',
    colorLabels: ['Red', 'Black', 'Pink'],
    includeFloral: true,
  },
  {
    index: 14,
    cat: 'Sozni',
    costInr: 125_000,
    name: 'Cream Terracotta Paisley Jaal Sozni',
    pattern: 'Dense cream-ground paisley jaal in terracotta, orange and ochre',
    colors: 'Cream, Terracotta, Orange, Ochre',
    googleColor: 'Beige',
    colorLabels: ['Beige', 'Orange', 'Red'],
    includeFloral: true,
  },
  {
    index: 15,
    cat: 'Sozni',
    costInr: 125_000,
    name: 'Black Multicolor Paisley Jaal Sozni',
    pattern: 'All-over multicolour paisley jaal on black ground',
    colors: 'Black, Magenta, Turquoise, Lavender, Green',
    googleColor: 'Black',
    colorLabels: ['Black', 'Pink', 'Blue'],
    includeFloral: true,
  },
  {
    index: 16,
    cat: 'Sozni',
    costInr: 135_000,
    name: 'Maroon Diamond Grid Sozni',
    pattern: 'All-over maroon diamond grid with floral motifs in gold and pastel threads',
    colors: 'Maroon, Gold, Pink, Blue',
    googleColor: 'Red',
    colorLabels: ['Red', 'Gold', 'Pink'],
    includeFloral: true,
  },
  {
    index: 17,
    cat: 'Sozni',
    costInr: 135_000,
    name: 'Beige Diamond Grid Sozni',
    pattern: 'All-over beige diamond grid with terracotta, green and mustard floral motifs',
    colors: 'Beige, Terracotta, Green, Mustard',
    googleColor: 'Beige',
    colorLabels: ['Beige', 'Orange', 'Green'],
    includeFloral: true,
  },
  {
    index: 18,
    cat: 'Sozni',
    costInr: 42_000,
    name: 'Cream Floral Vase Border Sozni',
    pattern: 'Cream ground with symmetrical floral vase motifs and multicolour bel border',
    colors: 'Cream, Magenta, Orange, Teal',
    googleColor: 'Beige',
    colorLabels: ['Beige', 'Pink', 'Orange'],
    includeFloral: true,
  },
  {
    index: 19,
    cat: 'Sozni',
    costInr: 130_000,
    name: 'Royal Blue Floral Jaal Sozni',
    pattern: 'Dense all-over floral jaal on royal blue with chinar leaf and blossom motifs',
    colors: 'Royal Blue, Peach, Fuchsia, Teal',
    googleColor: 'Blue',
    colorLabels: ['Blue', 'Pink', 'Orange'],
    includeFloral: true,
  },
  {
    index: 20,
    cat: 'Sozni',
    costInr: 48_000,
    name: 'Multicolor Stripe Band Sozni',
    pattern: 'Horizontal colour bands with fine white floral and paisley overlay',
    colors: 'Orange, Teal, Green, Plum, Navy, Mustard',
    googleColor: 'Multicolor',
    colorLabels: ['Orange', 'Blue', 'Green'],
    includeFloral: true,
  },
  {
    index: 21,
    cat: 'Sozni',
    costInr: 65_000,
    name: 'Purple Floral Jaal Sozni',
    pattern: 'All-over purple jaal with blue, yellow and green floral vine embroidery',
    colors: 'Purple, Blue, Yellow, Green',
    googleColor: 'Purple',
    colorLabels: ['Purple', 'Blue', 'Yellow'],
    includeFloral: true,
  },
  {
    index: 22,
    cat: 'Sozni',
    costInr: 130_000,
    name: 'Black Ochre Jamawar Sozni',
    pattern: 'Full jamawar with diagonal ochre and mint paisley bands on black',
    colors: 'Black, Ochre, Mint, Lavender',
    googleColor: 'Black',
    colorLabels: ['Black', 'Orange', 'Green'],
    includeFloral: true,
    extraTags: ['jamawar'],
  },
  {
    index: 23,
    cat: 'Sozni',
    costInr: 60_000,
    name: 'Rust Tonal Floral Jaal Sozni',
    pattern: 'All-over tonal rust jaal with vine and floral motifs in darker brown thread',
    colors: 'Rust, Brown',
    googleColor: 'Orange',
    colorLabels: ['Orange', 'Brown'],
    includeFloral: true,
  },
  {
    index: 25,
    cat: 'Sozni',
    costInr: 45_000,
    name: 'Cream Multicolor Border Sozni',
    pattern: 'Plain cream centre with wide multicolour paisley and floral side border',
    colors: 'Cream, Red, Pink, Blue, Green',
    googleColor: 'Beige',
    colorLabels: ['Beige', 'Red', 'Pink'],
    includeFloral: true,
  },
  {
    index: 26,
    cat: 'Reversible',
    costInr: 28_000,
    name: 'Beige Mustard Reversible',
    pattern: 'Plain double-face — oatmeal beige on one side, mustard gold on the other',
    colors: 'Beige, Mustard',
    googleColor: 'Beige',
    colorLabels: ['Beige', 'Yellow'],
    includeFloral: false,
    extraTags: ['reversible', 'reversible-pashmina', 'double-face'],
  },
  {
    index: 27,
    cat: 'Reversible',
    costInr: 28_000,
    name: 'Indigo Beige Reversible',
    pattern: 'Plain double-face — heathered indigo blue on one side, oatmeal on the other',
    colors: 'Indigo, Beige',
    googleColor: 'Blue',
    colorLabels: ['Blue', 'Beige'],
    includeFloral: false,
    extraTags: ['reversible', 'reversible-pashmina', 'double-face'],
  },
  {
    index: 28,
    cat: 'Reversible',
    costInr: 28_000,
    name: 'Terracotta Sand Reversible',
    pattern: 'Plain double-face — burnt terracotta on one side, sandy tan on the other',
    colors: 'Terracotta, Sand',
    googleColor: 'Orange',
    colorLabels: ['Orange', 'Beige'],
    includeFloral: false,
    extraTags: ['reversible', 'reversible-pashmina', 'double-face'],
  },
  {
    index: 29,
    cat: 'Reversible',
    costInr: 28_000,
    name: 'Charcoal Blush Reversible',
    pattern: 'Plain double-face — charcoal grey on one side, dusty blush on the other',
    colors: 'Charcoal, Blush',
    googleColor: 'Gray',
    colorLabels: ['Gray', 'Pink'],
    includeFloral: false,
    extraTags: ['reversible', 'reversible-pashmina', 'double-face'],
  },
  {
    index: 30,
    cat: 'Sozni',
    costInr: 30_000,
    name: 'Beige Butterfly Booti Sozni',
    pattern: 'Scattered butterfly and floral booti motifs on natural beige ground',
    colors: 'Beige, Blue, Pink, Yellow',
    googleColor: 'Beige',
    colorLabels: ['Beige', 'Blue', 'Pink'],
    includeFloral: true,
  },
  {
    index: 31,
    cat: 'Reversible',
    costInr: 28_000,
    name: 'Grey Denim Reversible',
    pattern: 'Plain double-face — heather grey on one side, denim blue on the other',
    colors: 'Grey, Denim Blue',
    googleColor: 'Gray',
    colorLabels: ['Gray', 'Blue'],
    includeFloral: false,
    extraTags: ['reversible', 'reversible-pashmina', 'double-face'],
  },
  {
    index: 32,
    cat: 'Sozni',
    costInr: 30_000,
    name: 'Beige Peacock Booti Sozni',
    pattern: 'Scattered peacock and bird booti motifs on natural beige ground',
    colors: 'Beige, Blue, Green, Brown',
    googleColor: 'Beige',
    colorLabels: ['Beige', 'Blue', 'Green'],
    includeFloral: false,
  },
];

const catalog = SPECS.map((spec) => {
  const cost = Number(costUsd(spec.costInr));
  const handle = seoHandle(spec);
  const tagSlug = spec.cat.toLowerCase();
  const tags = [
    tagSlug,
    'pashmina',
    'cashmere',
    ...(spec.extraTags ?? []),
    ...spec.colors.split(',').map((c) => slug(c.trim().split(' ')[0])),
  ].filter((t, i, a) => a.indexOf(t) === i);

  return {
    index: spec.index,
    folder: String(spec.index),
    path: IMG_DIR,
    category: spec.cat,
    collection: collectionFor(spec.cat),
    productType: spec.cat,
    costInr: spec.costInr,
    costRaw: String(spec.costInr),
    notes: [],
    images: [`${IMG_DIR}/${spec.index}.jpeg`],
    hero: `${IMG_DIR}/${spec.index}.jpeg`,
    title: `${spec.name} — Handwoven in Kashmir`,
    handle,
    sku: nextSku(spec.cat),
    costUsd: costUsd(spec.costInr),
    sellUsd: sellUsd(cost),
    seoTitle: `${spec.name} | Handwoven Kashmir | The Kashmir Weaver`.slice(
      0,
      70,
    ),
    seoDescription: `Buy an authentic handwoven Kashmir ${spec.cat} cashmere pashmina. ${spec.pattern.split('.')[0]}. Ships worldwide.`,
    tags,
    descriptionHtml: buildDescription(spec),
    googleColor: spec.googleColor,
    colorLabels: spec.colorLabels,
    includeFloral: spec.includeFloral,
    storyHint: slug(spec.name),
    requestMoreImages: true,
    vendor: 'MYSER',
  };
});

const out = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'data/whatsapp-batch-catalog.json',
);
writeFileSync(out, JSON.stringify(catalog, null, 2));
console.log(`Wrote ${catalog.length} products → ${out}`);
