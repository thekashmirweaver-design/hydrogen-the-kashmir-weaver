const himalayas = '/assets/himalayas.jpg';
const journalCraft = '/assets/journal-craft.jpg';
const goat = '/assets/changthangi-goat.jpg';
const artisan = '/assets/artisan-hands.jpg';

export type JournalCategory =
  | 'Heritage'
  | 'Craft'
  | 'Style'
  | 'Travel'
  | 'Literature'
  | 'Luxury Living';

export type JournalPost = {
  slug: string;
  cat: JournalCategory;
  title: string;
  excerpt: string;
  img: string;
  minutes: number;
  date: string;
};

export type JournalArticle = {
  title: string;
  cat: JournalCategory;
  minutes: number;
  img: string;
  /** Static fallback — plain-text paragraphs */
  body?: string[];
  /** Shopify blog body — rich HTML from the admin editor */
  bodyHtml?: string;
};

export const JOURNAL_CATEGORIES = [
  'All',
  'Heritage',
  'Craft',
  'Style',
  'Travel',
  'Literature',
  'Luxury Living',
] as const;

export const POSTS: JournalPost[] = [
  {
    slug: 'himalayan-highlands',
    cat: 'Heritage',
    title: 'The Himalayan Highlands',
    excerpt:
      'Above the tree line, on the Changthang plateau, a single goat produces 80 grams of fleece a year. This is how pashmina begins.',
    img: himalayas,
    minutes: 12,
    date: '2026-01-15',
  },
  {
    slug: 'hands-that-weave-magic',
    cat: 'Craft',
    title: 'Hands That Weave Magic',
    excerpt:
      'Meet the artisans who keep the tradition of Kashmiri craft alive — in workshops lit by lamp, by hand, by patience.',
    img: journalCraft,
    minutes: 8,
    date: '2025-11-20',
  },
  {
    slug: 'the-art-of-pashmina-care',
    cat: 'Style',
    title: 'The Art of Pashmina Care',
    excerpt:
      'Timeless pieces deserve timeless care. A quiet primer on living with cashmere — folding, storing, refreshing.',
    img: goat,
    minutes: 5,
    date: '2025-09-05',
  },
  {
    slug: 'a-letter-from-srinagar',
    cat: 'Travel',
    title: 'A Letter from Srinagar',
    excerpt:
      'Postcards from the valley — Dal Lake at dawn, the Mughal gardens at dusk, and the workshops in between.',
    img: artisan,
    minutes: 7,
    date: '2025-07-12',
  },
  {
    slug: 'the-language-of-sozni',
    cat: 'Craft',
    title: 'The Language of Sozni',
    excerpt:
      'A single shawl can hold three hundred days of needlework. We sit with Ghulam Nabi, a Sozni master, as he reads the grammar of the thread.',
    img: artisan,
    minutes: 9,
    date: '2026-06-10',
  },
  {
    slug: 'the-mark-of-the-real',
    cat: 'Heritage',
    title: 'The Mark of the Real',
    excerpt:
      'Not everything called pashmina is pashmina. The GI seal, the warmth in the hand, the way it slips through a ring — how to know the genuine thing.',
    img: himalayas,
    minutes: 6,
    date: '2026-05-18',
  },
  {
    slug: 'a-pashmina-for-every-hour',
    cat: 'Luxury Living',
    title: 'A Pashmina for Every Hour',
    excerpt:
      'From a linen morning to a midnight dinner — one shawl, worn six ways. A quiet study in how the same square moves through a day.',
    img: journalCraft,
    minutes: 7,
    date: '2026-04-02',
  },
];

export const ARTICLES: Record<string, JournalArticle> = {
  'himalayan-highlands': {
    title: 'The Himalayan Highlands',
    cat: 'Heritage',
    minutes: 12,
    img: himalayas,
    body: [
      'Above the tree line, on the Changthang plateau, a single goat produces eighty grams of fleece a year. To wrap a single shoulder takes the patience of fifteen winters.',
      'The cold is the secret. Through months of minus forty, the Changthangi grows a second coat — finer than any human-spun thread. The wind does the breeding; the altitude does the rest.',
      'This is not luxury manufactured. It is luxury that arrives, slowly, from the mountain.',
    ],
  },
  'hands-that-weave-magic': {
    title: 'Hands That Weave Magic',
    cat: 'Craft',
    minutes: 8,
    img: journalCraft,
    body: [
      'In Srinagar, a single shawl can pass through three generations of hands. Each name is recorded in the lining. Each hand is honoured.',
      'We do not innovate the craft. We protect it.',
    ],
  },
  'the-art-of-pashmina-care': {
    title: 'The Art of Pashmina Care',
    cat: 'Style',
    minutes: 5,
    img: goat,
    body: [
      'Fold, do not hang. Store in a breathable cotton pouch, never plastic. Refresh in open air, never in direct sun.',
      'Treated this way, a The Kashmir Weaver pashmina is not an heirloom in waiting. It is an heirloom already.',
    ],
  },
  'a-letter-from-srinagar': {
    title: 'A Letter from Srinagar',
    cat: 'Travel',
    minutes: 7,
    img: artisan,
    body: [
      'Dal Lake at dawn is the colour of a worn silver coin. By eight, the shikaras are out — slow, low, painted.',
      'Postcards from the valley — written for those who keep the quiet things.',
    ],
  },
  'the-language-of-sozni': {
    title: 'The Language of Sozni',
    cat: 'Craft',
    minutes: 9,
    img: artisan,
    body: [
      'Sozni is not embroidery so much as handwriting. Each artisan holds a needle finer than a chinar stem, and across three hundred days he composes a single field of flowers no wider than a palm.',
      'Ghulam Nabi learned the stitch from his father, who learned it from his. He does not draw the pattern first; he reads it from memory, the way one recites a half-remembered prayer.',
      'When the shawl is finished, the back is as clean as the front. That, he says, is the only signature that matters.',
    ],
  },
  'the-mark-of-the-real': {
    title: 'The Mark of the Real',
    cat: 'Heritage',
    minutes: 6,
    img: himalayas,
    body: [
      'True pashmina carries a Geographical Indication seal (GI No. 46) — a small, sovereign promise that the fibre was gathered in Ladakh and woven in Kashmir, by hand, on a wooden loom.',
      'But the surest test lives in the hand. Real pashmina is warm before you ask it to be, and a full shawl will pass, whispering, through a wedding ring.',
      'Beware the word blend. A little silk is honest; a little acrylic is not. Ask for the seal, then trust your fingers.',
    ],
  },
  'a-pashmina-for-every-hour': {
    title: 'A Pashmina for Every Hour',
    cat: 'Luxury Living',
    minutes: 7,
    img: journalCraft,
    body: [
      'Morning: loose at the shoulders over linen, the way you would wear a thought you have not yet finished.',
      'Afternoon: knotted once at the throat against the office chill. Evening: folded long down the spine of a coat. Night: doubled, drawn close, the colour of the room dimmed to match.',
      'One square, six hours, six women — all of them you.',
    ],
  },
};
