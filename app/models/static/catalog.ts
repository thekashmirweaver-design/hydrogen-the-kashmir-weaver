const emerald = "/assets/test-shawl.jpeg";
const ivory = "/assets/product-ivory.jpg";
const midnight = "/assets/product-midnight.jpg";
const charcoal = "/assets/product-charcoal.jpg";
const classic = "/assets/collection-classic.jpg";
const royal = "/assets/collection-royal.jpg";
const modern = "/assets/collection-modern.jpg";
const nature = "/assets/collection-nature.jpg";
const himalayas = "/assets/himalayas.jpg";
const craft = "/assets/craft-film.jpg";
const hands = "/assets/artisan-hands.jpg";

const bluePashmina1 = "/assets/blue-pashmina-1.jpg";
const bluePashmina2 = "/assets/blue-pashmina-2.jpg";
const bluePashmina3 = "/assets/blue-pashmina-3.jpg";
const bluePashmina4 = "/assets/blue-pashmina-4.jpg";
const bluePashmina5 = "/assets/blue-pashmina-5.jpg";

import type { Collection, Money, Product, ProductImage } from "../types";
import { usd } from "../money";
import { DEFAULT_FEATURED_COLLECTION_HANDLE } from "~/lib/featured-collection";

const collectionImage = (src: string, name: string): ProductImage => ({ src, alt: name });

const productImages = (srcs: string[], name: string): ProductImage[] =>
  srcs.map((src, i) => ({ src, alt: `${name} — view ${i + 1}` }));

/** Authoring shape for a collection — `hero` is a plain asset path here. */
type RawCollection = {
  id: string;
  handle: string;
  name: string;
  tagline: string;
  story: string;
  hero: string | ProductImage;
  seo?: { title?: string; description?: string };
};

export type { Collection, Money, Product, ProductImage };

const rawCollections: RawCollection[] = [
  {
    id: "col_solids",
    handle: "solids",
    name: "Solid Pashmina",
    tagline: "The purest expression of Himalayan fleece.",
    story:
      "Unembellished and profoundly soft, a solid Pashmina relies entirely on the immaculate quality of the Changthangi goat fleece and the flawless rhythm of the weaver's hand. Stripped of all distraction, it is luxury in its most elemental and versatile form.",
    hero: modern,
    seo: {
      title: "Solid Pashmina — The Kashmir Weaver",
      description:
        "Solid Pashmina — the purest expression of Himalayan fleece. Unembellished and profoundly soft luxury in its elemental form.",
    },
  },
  {
    id: "col_sozni",
    handle: "sozni",
    name: "Sozni Embroidery",
    tagline: "The poetry of the needle.",
    story:
      "Sozni is a microscopic needlework technique unique to Kashmir. Using a needle as fine as a pine needle, master artisans trace incredibly intricate floral and paisley motifs across the fabric. A single masterpiece can take over a year of continuous, meditative dedication to complete.",
    hero: royal,
    seo: {
      title: "Sozni Embroidery — The Kashmir Weaver",
      description:
        "Sozni Embroidery — the poetry of the needle. A microscopic needlework technique creating incredibly intricate floral motifs.",
    },
  },
  {
    id: "col_tilla",
    handle: "tilla",
    name: "Tilla Embroidery",
    tagline: "The golden thread of royalty.",
    story:
      "Originally patronized by Mughal emperors, Tilla involves couching fine metallic gold or silver threads onto the Pashmina. The threads are carefully laid over the fabric and secured with hidden stitches, creating a regal, three-dimensional tapestry that ages into a treasured family heirloom.",
    hero: classic,
    seo: {
      title: "Tilla Embroidery — The Kashmir Weaver",
      description:
        "Tilla Embroidery — the golden thread of royalty. Regal metallic gold and silver threads couched onto fine Pashmina.",
    },
  },
  {
    id: "col_kani",
    handle: "kani",
    name: "Kani Pashmina",
    tagline: "The pinnacle of Kashmiri weaving.",
    story:
      "Woven using eyeless wooden bobbins called 'kanis', this technique builds the pattern thread by thread directly into the fabric's structure. The weaver follows a coded script called 'Taleem', taking up to two years to complete a single, seamless tapestry of interwoven color.",
    hero: hands,
    seo: {
      title: "Kani Pashmina — The Kashmir Weaver",
      description:
        "Kani Pashmina — the pinnacle of Kashmiri weaving. Patterns built thread by thread into the fabric structure using wooden bobbins.",
    },
  },
  {
    handle: "maheen-kari",
    id: "col_maheen-kari",
    name: "Maheen Kari",
    tagline: "The finest expression of hand embroidery",
    story:
      "Maheen Kari refers to exceptionally fine and delicate hand embroidery executed with microscopic precision. Built upon the traditional Sozni technique, its nearly invisible stitches create refined floral and paisley motifs that demand immense patience and mastery, making each piece highly prized by collectors.",
    hero: craft,
    seo: {
      title: "Maheen Kari — The Kashmir Weaver",
      description:
        "Maheen Kari refers to exceptionally fine and delicate hand embroidery executed with microscopic precision.",
    },
  },
  {
    id: "col_homepage_featured",
    handle: DEFAULT_FEATURED_COLLECTION_HANDLE,
    name: "Homepage Featured",
    tagline: "Curated for the homepage",
    story:
      "Products in this collection appear on the homepage Featured Pieces carousel and in the shop Featured sort. Reorder them manually in Shopify Admin.",
    hero: royal,
    seo: {
      title: "Homepage Featured — The Kashmir Weaver",
      description: "Curated pieces featured on the homepage.",
    },
  },
];

export const collections: Collection[] = rawCollections.map((c) => ({
  ...c,
  hero: typeof c.hero === "string" ? collectionImage(c.hero, c.name) : c.hero,
}));

/** Authoring shape for a product — `images` are plain asset paths here. */
type CatalogEntry = {
  id: string;
  handle: string;
  name: string;
  collectionSlug: string;
  collectionName: string;
  price: number;
  compareAtPrice?: number;
  shortDescription: string;
  description: string;
  story: string;
  images: string[];
  material: string;
  origin: string;
  weave: string;
  stock: "in" | "out";
  limited?: boolean;
  stockQty?: number;
  productType?: string;
  vendor?: string;
  tags?: string[];
  seo?: { title?: string; description?: string };
  createdAt: string;
  publishedAt?: string;
};

const mat = "Handwoven Kashmiri pashmina cashmere";

const C = {
  solids: { handle: "solids", name: "Solid Pashmina" },
  sozni: { handle: "sozni", name: "Sozni Embroidery" },
  tilla: { handle: "tilla", name: "Tilla Embroidery" },
  kani: { handle: "kani", name: "Kani Pashmina" },
  maheenKari: { handle: "maheen-kari", name: "Maheen Kari" },
  // Backwards compatibility aliases for existing catalog array items
  jamawar: { handle: "sozni", name: "Sozni Embroidery" },
  reversible: { handle: "solids", name: "Solid Pashmina" },
};

const catalog: CatalogEntry[] = [
  // ---------- Jamawar Embroidery ----------
  {
    id: "prod_azure-vine-pashmina",
    handle: "azure-vine-pashmina",
    name: "Azure Vine Pashmina",
    collectionSlug: C.jamawar.handle,
    collectionName: C.jamawar.name,
    price: 1450,
    shortDescription:
      "A natural beige pashmina with intricate azure blue sozni embroidery featuring vine and floral motifs along the borders.",
    description:
      "Hand-woven in pure pashmina cashmere, this natural base shawl is adorned with elaborate azure blue sozni embroidery forming classic vine and floral borders. Each motif is meticulously hand-embroidered by Kashmiri artisans.",
    story:
      "The contrast of the vibrant azure thread on the undyed natural pashmina speaks of clear skies over the snow-capped Himalayas.",
    images: [bluePashmina1, bluePashmina2, bluePashmina3, bluePashmina4, bluePashmina5],
    material: mat,
    origin: "Srinagar, Kashmir",
    weave: "Hand-woven, sozni embroidery",
    stock: "in",
    productType: "Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["jamawar-embroidery", "sozni", "floral"],
    createdAt: "2025-11-13",
    publishedAt: "2025-11-13",
    seo: {
      title: "Azure Vine Pashmina — The Kashmir Weaver",
      description:
        "A natural beige pashmina with intricate azure blue sozni embroidery featuring vine and floral motifs along the borders.",
    },
  },
  {
    id: "prod_emerald-zardozi-pashmina",
    handle: "emerald-zardozi-pashmina",
    name: "Emerald Zardozi Pashmina",
    collectionSlug: C.jamawar.handle,
    collectionName: C.jamawar.name,
    price: 1250,
    shortDescription:
      "Deep emerald ground with metallic zardozi at the four corners and central medallion.",
    description:
      "40 × 80 inch hand-woven pashmina shawl, finished with metallic zardozi embroidery on the four corners and central medallion. Edges hand-knotted. One of one.",
    story:
      "Woven over fourteen weeks in Srinagar — three generations of hands carried in a single shawl.",
    images: [emerald, royal, midnight, ivory, charcoal, craft, hands, classic, modern, nature],
    material: mat,
    origin: "Srinagar, Kashmir",
    weave: "Hand-woven, hand-embroidered zardozi",
    stock: "in",
    limited: true,
    productType: "Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["jamawar-embroidery", "zardozi", "limited"],
    createdAt: "2025-11-12",
    publishedAt: "2025-11-12",
    seo: {
      title: "Emerald Zardozi Pashmina — The Kashmir Weaver",
      description:
        "Deep emerald ground with metallic zardozi at the four corners and central medallion.",
    },
  },
  {
    id: "prod_midnight-paisley-shawl",
    handle: "midnight-paisley-shawl",
    name: "Midnight Paisley Shawl",
    collectionSlug: C.jamawar.handle,
    collectionName: C.jamawar.name,
    price: 1050,
    compareAtPrice: 1250,
    shortDescription: "Midnight ground with the buta motif drawn in burnished silver-gold thread.",
    description:
      "36 × 80 inches. Jamawar woven shawl in midnight blue, paisley repeating across the field. Signed by the weaver on the inner edge.",
    story:
      "The paisley — born in Persia, raised in Kashmir — rendered by lamplight in the deepest of blues.",
    images: [midnight, royal],
    material: mat,
    origin: "Srinagar, Kashmir",
    weave: "Jamawar weave, sozni overlay",
    stock: "in",
    stockQty: 5,
    productType: "Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["jamawar-embroidery", "sozni", "paisley"],
    createdAt: "2024-06-18",
    publishedAt: "2024-06-18",
    seo: {
      title: "Midnight Paisley Shawl — The Kashmir Weaver",
      description: "Midnight ground with the buta motif drawn in burnished silver-gold thread.",
    },
  },
  {
    id: "prod_crimson-jamawar",
    handle: "crimson-jamawar",
    name: "Crimson Jamawar",
    collectionSlug: C.jamawar.handle,
    collectionName: C.jamawar.name,
    price: 1380,
    shortDescription: "A deep crimson jamawar — the colour of garnet and lamplit silk.",
    description:
      "Densely woven jamawar in crimson with antique-gold tonal threadwork. Finished with hand-knotted fringe.",
    story: "Drawn from the court palettes of nineteenth-century Lucknow — quiet, slow, and earned.",
    images: [royal, emerald],
    material: mat,
    origin: "Srinagar, Kashmir",
    weave: "Jamawar weave",
    stock: "out",
    limited: true,
    productType: "Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["jamawar-embroidery", "jamawar", "limited"],
    createdAt: "2026-02-09",
    publishedAt: "2026-02-09",
    seo: {
      title: "Crimson Jamawar — The Kashmir Weaver",
      description: "A deep crimson jamawar — the colour of garnet and lamplit silk.",
    },
  },
  {
    id: "prod_ivory-sozni-pashmina",
    handle: "ivory-sozni-pashmina",
    name: "Ivory Sozni Pashmina",
    collectionSlug: C.jamawar.handle,
    collectionName: C.jamawar.name,
    price: 1150,
    compareAtPrice: 1350,
    shortDescription:
      "Soft ivory ground with a tonal sozni border — twelve thousand stitches by hand.",
    description:
      "36 × 80 inch ivory pashmina with a tonal sozni border drawn by needle through twelve thousand stitches. Suited to all seasons.",
    story:
      "The discipline of restraint. A single tonal border, the work of an artisan who has spent forty years refining one technique.",
    images: [ivory, classic],
    material: mat,
    origin: "Budgam, Kashmir",
    weave: "Hand-embroidered sozni",
    stock: "in",
    stockQty: 8,
    productType: "Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["jamawar-embroidery", "sozni"],
    createdAt: "2024-09-30",
    publishedAt: "2024-09-30",
    seo: {
      title: "Ivory Sozni Pashmina — The Kashmir Weaver",
      description:
        "Soft ivory ground with a tonal sozni border — twelve thousand stitches by hand.",
    },
  },
  {
    id: "prod_ivory-bridal-shawl",
    handle: "ivory-bridal-shawl",
    name: "Ivory Bridal Shawl",
    collectionSlug: C.jamawar.handle,
    collectionName: C.jamawar.name,
    price: 2400,
    shortDescription: "A ceremonial ivory shawl, hand-embroidered with rose-gold thread.",
    description:
      "40 × 84 inches. Hand-embroidered in rose-gold sozni across the field, with a central medallion and four-corner motif. Numbered, registered, signed.",
    story: "Eighteen months on the loom. Three women, three winters.",
    images: [ivory, classic],
    material: mat,
    origin: "Srinagar, Kashmir",
    weave: "Hand-embroidered sozni",
    stock: "in",
    limited: true,
    productType: "Bridal Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["jamawar-embroidery", "sozni", "bridal", "limited"],
    createdAt: "2025-03-21",
    publishedAt: "2025-03-21",
    seo: {
      title: "Ivory Bridal Shawl — The Kashmir Weaver",
      description: "A ceremonial ivory shawl, hand-embroidered with rose-gold thread.",
    },
  },
  {
    id: "prod_blush-rose-pashmina",
    handle: "blush-rose-pashmina",
    name: "Blush Rose Pashmina",
    collectionSlug: C.jamawar.handle,
    collectionName: C.jamawar.name,
    price: 1880,
    compareAtPrice: 2200,
    shortDescription: "Blush ground with delicate rose-vine sozni at the border.",
    description: "36 × 80 inches. Tonal rose-vine sozni along the border, central plain field.",
    story: "A first dawn, in cashmere — drawn from the rose gardens of Shalimar.",
    images: [classic, ivory],
    material: mat,
    origin: "Srinagar, Kashmir",
    weave: "Hand-embroidered sozni",
    stock: "in",
    stockQty: 3,
    productType: "Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["jamawar-embroidery", "sozni"],
    createdAt: "2026-05-02",
    publishedAt: "2026-05-02",
    seo: {
      title: "Blush Rose Pashmina — The Kashmir Weaver",
      description: "Blush ground with delicate rose-vine sozni at the border.",
    },
  },
  {
    id: "prod_champagne-ceremonial",
    handle: "champagne-ceremonial",
    name: "Champagne Ceremonial",
    collectionSlug: C.jamawar.handle,
    collectionName: C.jamawar.name,
    price: 2100,
    shortDescription: "Champagne ground with hand-stitched zardozi at the four corners.",
    description: "38 × 82 inches. Zardozi embroidery, hand-finished fringe, registered and signed.",
    story: "The colour of the first toast at a wedding lit only by oil lamps.",
    images: [ivory, royal],
    material: mat,
    origin: "Srinagar, Kashmir",
    weave: "Hand-embroidered zardozi",
    stock: "out",
    limited: true,
    productType: "Bridal Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["jamawar-embroidery", "zardozi", "bridal", "limited"],
    createdAt: "2024-12-05",
    publishedAt: "2024-12-05",
    seo: {
      title: "Champagne Ceremonial — The Kashmir Weaver",
      description: "Champagne ground with hand-stitched zardozi at the four corners.",
    },
  },
  {
    id: "prod_chinar-leaf-archive",
    handle: "chinar-leaf-archive",
    name: "Chinar Leaf — Archive",
    collectionSlug: C.jamawar.handle,
    collectionName: C.jamawar.name,
    price: 2800,
    shortDescription: "Autumn chinar leaves embroidered in rust on a moss field.",
    description: "Reissued from a 1962 pattern in the The Kashmir Weaver archive. 38 × 80 inches.",
    story: "Pulled from the family ledger. The pattern had not been woven in sixty years.",
    images: [nature, craft],
    material: mat,
    origin: "Srinagar, Kashmir",
    weave: "Hand-embroidered sozni",
    stock: "in",
    limited: true,
    productType: "Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["jamawar-embroidery", "sozni", "archive", "limited"],
    createdAt: "2025-07-14",
    publishedAt: "2025-07-14",
    seo: {
      title: "Chinar Leaf — Archive — The Kashmir Weaver",
      description: "Autumn chinar leaves embroidered in rust on a moss field.",
    },
  },
  {
    id: "prod_terracotta-paisley",
    handle: "terracotta-paisley",
    name: "Terracotta Paisley",
    collectionSlug: C.jamawar.handle,
    collectionName: C.jamawar.name,
    price: 980,
    compareAtPrice: 1200,
    shortDescription:
      "Rust and terracotta with tonal paisley — the colour of the Ladakh plateau at dusk.",
    description:
      "Madder-root and walnut-hull dyed pashmina, 34 × 78 inches, with tonal paisley field.",
    story:
      "Colour drawn directly from the earth that raised the goats whose fleece it is woven from.",
    images: [nature, classic],
    material: mat,
    origin: "Anantnag, Kashmir",
    weave: "Hand-painted, hand-embroidered",
    stock: "in",
    stockQty: 10,
    productType: "Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["jamawar-embroidery", "paisley", "naturally-dyed"],
    createdAt: "2026-01-19",
    publishedAt: "2026-01-19",
    seo: {
      title: "Terracotta Paisley — The Kashmir Weaver",
      description:
        "Rust and terracotta with tonal paisley — the colour of the Ladakh plateau at dusk.",
    },
  },

  // ---------- Kani Pashmina ----------
  {
    id: "prod_kani-medallion-noir",
    handle: "kani-medallion-noir",
    name: "Kani Medallion — Noir",
    collectionSlug: C.kani.handle,
    collectionName: C.kani.name,
    price: 4200,
    shortDescription:
      "A black Kani shawl with a central gold medallion — over two years on the loom.",
    description: "Kani-woven on a single loom across 28 months. 40 × 86 inches. One of three.",
    story:
      "The Kani technique is woven, not embroidered — every motif is built into the fabric itself.",
    images: [royal, hands],
    material: mat,
    origin: "Kanihama, Kashmir",
    weave: "Kani (twill-tapestry)",
    stock: "out",
    limited: true,
    productType: "Kani Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["kani-pashmina", "kani", "limited"],
    createdAt: "2024-03-08",
    publishedAt: "2024-03-08",
    seo: {
      title: "Kani Medallion — Noir — The Kashmir Weaver",
      description: "A black Kani shawl with a central gold medallion — over two years on the loom.",
    },
  },
  {
    id: "prod_kani-ivory-grove",
    handle: "kani-ivory-grove",
    name: "Kani Ivory Grove",
    collectionSlug: C.kani.handle,
    collectionName: C.kani.name,
    price: 3600,
    shortDescription: "Kani-woven ivory ground with chinar grove motifs in soft tonal browns.",
    description:
      "36 × 80 inches. Kani twill-tapestry weave. Each motif placed thread by thread on a single loom across nineteen months.",
    story: "The artisan worked from a coded chant — Talim — passed down from his grandfather.",
    images: [ivory, hands],
    material: mat,
    origin: "Kanihama, Kashmir",
    weave: "Kani (twill-tapestry)",
    stock: "in",
    limited: true,
    productType: "Kani Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["kani-pashmina", "kani", "limited"],
    createdAt: "2025-09-27",
    publishedAt: "2025-09-27",
    seo: {
      title: "Kani Ivory Grove — The Kashmir Weaver",
      description: "Kani-woven ivory ground with chinar grove motifs in soft tonal browns.",
    },
  },
  {
    id: "prod_kani-burgundy-buta",
    handle: "kani-burgundy-buta",
    name: "Kani Burgundy Buta",
    collectionSlug: C.kani.handle,
    collectionName: C.kani.name,
    price: 3900,
    shortDescription: "A burgundy Kani shawl with paisley buta woven in saffron and cream.",
    description: "38 × 82 inches. Kani-woven across two seasons. Hand-knotted fringe.",
    story: "Two artisans worked the loom in shifts. Neither saw the finished shawl alone.",
    images: [royal, emerald],
    material: mat,
    origin: "Kanihama, Kashmir",
    weave: "Kani (twill-tapestry)",
    stock: "in",
    limited: true,
    productType: "Kani Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["kani-pashmina", "kani", "buta", "limited"],
    createdAt: "2024-08-11",
    publishedAt: "2024-08-11",
    seo: {
      title: "Kani Burgundy Buta — The Kashmir Weaver",
      description: "A burgundy Kani shawl with paisley buta woven in saffron and cream.",
    },
  },
  {
    id: "prod_kani-storm-grey",
    handle: "kani-storm-grey",
    name: "Kani Storm Grey",
    collectionSlug: C.kani.handle,
    collectionName: C.kani.name,
    price: 3400,
    shortDescription: "A Kani stole in storm grey, with architectural diamond motifs in graphite.",
    description: "30 × 78 inches. A narrower Kani study — the loom turned to architecture.",
    story: "Built like a building. Line, plane, restraint.",
    images: [charcoal, modern],
    material: mat,
    origin: "Kanihama, Kashmir",
    weave: "Kani (twill-tapestry)",
    stock: "in",
    productType: "Pashmina Stole",
    vendor: "The Kashmir Weaver",
    tags: ["kani-pashmina", "kani", "stole"],
    createdAt: "2026-03-15",
    publishedAt: "2026-03-15",
    seo: {
      title: "Kani Storm Grey — The Kashmir Weaver",
      description: "A Kani stole in storm grey, with architectural diamond motifs in graphite.",
    },
  },
  {
    id: "prod_kani-lapis-archive",
    handle: "kani-lapis-archive",
    name: "Kani Lapis — Archive",
    collectionSlug: C.kani.handle,
    collectionName: C.kani.name,
    price: 4800,
    shortDescription: "An archive Kani shawl in lapis blue — a single piece from the 1958 ledger.",
    description:
      "40 × 84 inches. Kani twill-tapestry weave, reissued from a The Kashmir Weaver family pattern dated 1958.",
    story: "The original was kept in muslin for sixty-eight years. This is its second life.",
    images: [midnight, hands],
    material: mat,
    origin: "Kanihama, Kashmir",
    weave: "Kani (twill-tapestry)",
    stock: "out",
    limited: true,
    productType: "Kani Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["kani-pashmina", "kani", "archive", "limited"],
    createdAt: "2025-01-23",
    publishedAt: "2025-01-23",
    seo: {
      title: "Kani Lapis — Archive — The Kashmir Weaver",
      description: "An archive Kani shawl in lapis blue — a single piece from the 1958 ledger.",
    },
  },
  {
    id: "prod_ladakh-sunset-one-of-one",
    handle: "ladakh-sunset-one-of-one",
    name: "Ladakh Sunset — N°01",
    collectionSlug: C.kani.handle,
    collectionName: C.kani.name,
    price: 3200,
    shortDescription: "A one-of-one Kani shawl in the colours of the Ladakh sky at sunset.",
    description:
      "40 × 84 inches. Naturally dyed, Kani-woven. Numbered N°01 of 01. GI tag (No. 46) available on request.",
    story: "Two years on the loom. The artisan has signed the inner edge. It will not be repeated.",
    images: [nature, himalayas, hands],
    material: mat,
    origin: "Kanihama, Kashmir",
    weave: "Kani (twill-tapestry)",
    stock: "in",
    limited: true,
    productType: "Kani Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["kani-pashmina", "kani", "naturally-dyed", "limited"],
    createdAt: "2026-06-01",
    publishedAt: "2026-06-01",
    seo: {
      title: "Ladakh Sunset — N°01 — The Kashmir Weaver",
      description: "A one-of-one Kani shawl in the colours of the Ladakh sky at sunset.",
    },
  },

  // ---------- Reversible Pashmina ----------
  {
    id: "prod_graphite-ivory-reversible",
    handle: "graphite-ivory-reversible",
    name: "Graphite / Ivory Reversible",
    collectionSlug: C.reversible.handle,
    collectionName: C.reversible.name,
    price: 1180,
    compareAtPrice: 1380,
    shortDescription: "A double-faced shawl — graphite on one side, ivory on the other.",
    description:
      "36 × 80 inches. Two-ply reversible weave, joined invisibly along the selvedge. Day, and night, in a single shawl.",
    story: "Turn it, and the season changes.",
    images: [charcoal, ivory],
    material: mat,
    origin: "Pulwama, Kashmir",
    weave: "Reversible double-face",
    stock: "in",
    stockQty: 5,
    productType: "Reversible Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["reversible-pashmina", "reversible", "double-face"],
    createdAt: "2024-04-26",
    publishedAt: "2024-04-26",
    seo: {
      title: "Graphite / Ivory Reversible — The Kashmir Weaver",
      description: "A double-faced shawl — graphite on one side, ivory on the other.",
    },
  },
  {
    id: "prod_slate-tobacco-reversible",
    handle: "slate-tobacco-reversible",
    name: "Slate / Tobacco Reversible",
    collectionSlug: C.reversible.handle,
    collectionName: C.reversible.name,
    price: 1240,
    shortDescription: "Slate on one face, tobacco on the other.",
    description: "34 × 80 inches. Diamond-twill reversible weave with a faint tonal selvedge.",
    story: "Architecture, for travel. Two tonal worlds in one piece.",
    images: [modern, charcoal],
    material: mat,
    origin: "Budgam, Kashmir",
    weave: "Reversible diamond twill",
    stock: "in",
    productType: "Reversible Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["reversible-pashmina", "reversible"],
    createdAt: "2025-05-19",
    publishedAt: "2025-05-19",
    seo: {
      title: "Slate / Tobacco Reversible — The Kashmir Weaver",
      description: "Slate on one face, tobacco on the other.",
    },
  },
  {
    id: "prod_emerald-bone-reversible",
    handle: "emerald-bone-reversible",
    name: "Emerald / Bone Reversible",
    collectionSlug: C.reversible.handle,
    collectionName: C.reversible.name,
    price: 1320,
    shortDescription: "Deep emerald on one side, undyed bone on the other.",
    description:
      "36 × 80 inches. Reversible plain weave. Bone-coloured face shows the fibre as it leaves the loom.",
    story: "The bride's first travel piece — a wedding in winter, a return in spring.",
    images: [emerald, ivory],
    material: mat,
    origin: "Srinagar, Kashmir",
    weave: "Reversible plain weave",
    stock: "in",
    limited: true,
    productType: "Reversible Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["reversible-pashmina", "reversible", "limited"],
    createdAt: "2024-11-07",
    publishedAt: "2024-11-07",
    seo: {
      title: "Emerald / Bone Reversible — The Kashmir Weaver",
      description: "Deep emerald on one side, undyed bone on the other.",
    },
  },
  {
    id: "prod_navy-blush-reversible",
    handle: "navy-blush-reversible",
    name: "Navy / Blush Reversible",
    collectionSlug: C.reversible.handle,
    collectionName: C.reversible.name,
    price: 1180,
    shortDescription: "Navy on one face, blush rose on the other.",
    description: "32 × 78 inches. Reversible weave finished with hand-knotted fringe.",
    story: "Worn navy by day, blush by evening — without ever changing the shawl.",
    images: [midnight, classic],
    material: mat,
    origin: "Budgam, Kashmir",
    weave: "Reversible plain weave",
    stock: "in",
    productType: "Reversible Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["reversible-pashmina", "reversible"],
    createdAt: "2025-12-30",
    publishedAt: "2025-12-30",
    seo: {
      title: "Navy / Blush Reversible — The Kashmir Weaver",
      description: "Navy on one face, blush rose on the other.",
    },
  },
  {
    id: "prod_fog-walnut-reversible",
    handle: "fog-walnut-reversible",
    name: "Fog / Walnut Reversible",
    collectionSlug: C.reversible.handle,
    collectionName: C.reversible.name,
    price: 980,
    shortDescription: "A long, slim reversible scarf — fog grey and walnut brown.",
    description: "18 × 76 inches. Narrow-cut reversible scarf, day-to-night, season to season.",
    story: "The hour before sunrise on one side, the hour after sunset on the other.",
    images: [modern, nature],
    material: mat,
    origin: "Srinagar, Kashmir",
    weave: "Reversible plain weave",
    stock: "out",
    productType: "Pashmina Scarf",
    vendor: "The Kashmir Weaver",
    tags: ["reversible-pashmina", "reversible", "scarf"],
    createdAt: "2024-02-14",
    publishedAt: "2024-02-14",
    seo: {
      title: "Fog / Walnut Reversible — The Kashmir Weaver",
      description: "A long, slim reversible scarf — fog grey and walnut brown.",
    },
  },
  {
    id: "prod_moss-clay-reversible",
    handle: "moss-clay-reversible",
    name: "Moss / Clay Reversible",
    collectionSlug: C.reversible.handle,
    collectionName: C.reversible.name,
    price: 1080,
    compareAtPrice: 1280,
    shortDescription: "Moss green and clay — two earthen faces, one shawl.",
    description: "34 × 78 inches. Naturally dyed reversible pashmina with hand-knotted fringe.",
    story: "The under-canopy of a chinar grove and the bank of the river below it.",
    images: [nature, classic],
    material: mat,
    origin: "Anantnag, Kashmir",
    weave: "Reversible plain weave",
    stock: "in",
    productType: "Reversible Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["reversible-pashmina", "reversible", "naturally-dyed"],
    createdAt: "2025-10-08",
    publishedAt: "2025-10-08",
    seo: {
      title: "Moss / Clay Reversible — The Kashmir Weaver",
      description: "Moss green and clay — two earthen faces, one shawl.",
    },
  },
  {
    id: "prod_midnight-saffron-reversible",
    handle: "midnight-saffron-reversible",
    name: "Midnight / Saffron Reversible",
    collectionSlug: C.reversible.handle,
    collectionName: C.reversible.name,
    price: 1420,
    shortDescription: "Midnight blue on one side, deep saffron on the other.",
    description:
      "36 × 80 inches. Reversible jacquard weave with a subtle tonal stripe along the selvedge.",
    story: "Two ceremonies, one shawl — winter wedding, summer return.",
    images: [midnight, royal],
    material: mat,
    origin: "Srinagar, Kashmir",
    weave: "Reversible jacquard",
    stock: "in",
    limited: true,
    productType: "Reversible Pashmina Shawl",
    vendor: "The Kashmir Weaver",
    tags: ["reversible-pashmina", "reversible", "jacquard", "limited"],
    createdAt: "2026-04-22",
    publishedAt: "2026-04-22",
    seo: {
      title: "Midnight / Saffron Reversible — The Kashmir Weaver",
      description: "Midnight blue on one side, deep saffron on the other.",
    },
  },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Normalize authoring entries into the Shopify-shaped `Product`:
//  - plain asset paths become `ProductImage` objects with alt text,
//  - the base-USD numbers become `Money`
const normalizeProduct = (e: CatalogEntry): Product => {
  const images = productImages(e.images, e.name);
  const price = usd(e.price);
  const compareAtPrice = e.compareAtPrice != null ? usd(e.compareAtPrice) : undefined;

  return {
    ...e,
    images,
    price,
    compareAtPrice,
  };
};

export const products: Product[] = catalog.map(normalizeProduct);

export const getCollection = (handle: string) => collections.find((c) => c.handle === handle);
export const getProduct = (handle: string) => products.find((p) => p.handle === handle);
export const productsByCollection = (handle: string) => {
  if (handle === DEFAULT_FEATURED_COLLECTION_HANDLE) {
    return products.slice(0, 8);
  }
  return products.filter((p) => p.collectionSlug === handle);
};

export const allWeaveFacets = (): string[] =>
  Array.from(new Set(products.map((p) => p.weave))).sort();

export const allOriginFacets = (): string[] =>
  Array.from(new Set(products.map((p) => p.origin))).sort();
