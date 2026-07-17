/**
 * 1) Append shop CTAs to priority journal articles (if solids link missing)
 * 2) Create exactly 2 new journal posts
 *
 * Run: npx tsx scripts/journal-ctas-and-new-posts.ts
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const API_VERSION = '2025-01';
const STOREFRONT = 'https://thekashmirweaver.shop';
const SOLIDS = `${STOREFRONT}/collections/solids`;
const CREAM = `${STOREFRONT}/products/cream-white-cashmere-pashmina-shawl-handwoven-in-kashmir`;
const KANI_COL = `${STOREFRONT}/collections/kani`;
const KANI_PDP_1 = `${STOREFRONT}/products/ivory-floral-kani-handwoven-pashmina-shawl-pure-cashmere-from-kashmir`;
const KANI_PDP_2 = `${STOREFRONT}/products/handwoven-kani-pashmina-shawl-ivory-black-purple-floral-heritage-weave`;

function loadEnvFile() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const SHOP = process.env.PUBLIC_STORE_DOMAIN ?? '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';

if (!SHOP || !TOKEN) {
  console.error('Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN');
  process.exit(1);
}

type AdminResponse<T> = {data?: T; errors?: Array<{message: string}>};

async function adminGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(
    `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': TOKEN,
      },
      body: JSON.stringify({query, variables}),
    },
  );
  const json = (await res.json()) as AdminResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  if (!json.data) throw new Error('GraphQL response missing data');
  return json.data;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ctaSolids(opts?: {secondaryCream?: boolean; intro?: string}): string {
  const intro =
    opts?.intro ??
    'If you are ready to choose a piece of your own, begin with our Solid Pashmina collection — handwoven Kashmiri cashmere in quiet, wearable colours.';
  const cream = opts?.secondaryCream
    ? `<p>Prefer a classic starting point? Explore our <a href="${CREAM}">Cream White Cashmere Pashmina</a> — a versatile shawl that works across seasons and occasions.</p>`
    : '';
  return `
<hr />
<h2>Shop The Kashmir Weaver</h2>
<p>${intro}</p>
<p><a href="${SOLIDS}"><strong>Explore Solid Pashmina →</strong></a></p>
${cream}`.trim();
}

function ctaKani(): string {
  return `
<hr />
<h2>Shop Kani &amp; Solid Pashmina</h2>
<p>For the woven tapestry tradition described above, browse our <a href="${KANI_COL}">Kani Pashmina</a> collection — including the <a href="${KANI_PDP_1}">Ivory Floral Kani</a> and <a href="${KANI_PDP_2}">Ivory Black Purple Floral Kani</a>.</p>
<p>For everyday colour and drape, start with <a href="${SOLIDS}"><strong>Solid Pashmina →</strong></a></p>`.trim();
}

const PRIORITY_CTAS: Record<
  string,
  {build: () => string; note: string}
> = {
  'how-to-tell-if-pashmina-is-real': {
    note: 'authenticity → solids + cream',
    build: () =>
      ctaSolids({
        secondaryCream: true,
        intro:
          'Once you know what real Pashmina feels like, the next step is choosing a piece woven with that integrity. Our Solid Pashmina shawls are handwoven in Kashmir from pure cashmere — no blends, no shortcuts.',
      }),
  },
  'why-is-real-kashmiri-pashmina-expensive': {
    note: 'cost story → solids',
    build: () =>
      ctaSolids({
        intro:
          'Understanding the true cost of Kashmiri Pashmina makes choosing wisely easier. Explore our Solid Pashmina collection — each piece reflects the rarity and craft described above.',
      }),
  },
  'luxury-bridal-trousseau-kashmiri-pashmina': {
    note: 'bridal → solids + cream',
    build: () =>
      ctaSolids({
        secondaryCream: true,
        intro:
          'For a bridal trousseau, begin with a colour you will reach for for decades. Our Solid Pashmina collection offers timeless shades suited to weddings, travel, and everyday luxury.',
      }),
  },
  'a-thoughtful-guide-to-gifting-pashmina': {
    note: 'gifting → solids + cream',
    build: () =>
      ctaSolids({
        secondaryCream: true,
        intro:
          'Ready to gift with intention? Browse our Solid Pashmina collection — refined colours and classic sizes that suit weddings, milestones, and thoughtful everyday presents.',
      }),
  },
  'how-to-style-pashmina-everyday-luxury': {
    note: 'styling → solids',
    build: () =>
      ctaSolids({
        intro:
          'The drapes above work best with genuine handwoven Pashmina. Find everyday colours and sizes in our Solid Pashmina collection.',
      }),
  },
  'what-is-kani-weaving-kashmiri-shawl': {
    note: 'kani → kani collection + PDPs + solids',
    build: () => ctaKani(),
  },
  'eight-practical-ways-to-wear-a-pashmina-shawl': {
    note: 'wear guide → solids',
    build: () =>
      ctaSolids({
        intro:
          'A full-size shawl gives you every option above. Choose yours from our Solid Pashmina collection — handwoven Kashmiri cashmere in colours made for daily wear.',
      }),
  },
};

const NEW_ARTICLES = [
  {
    handle: 'cashmere-scarf-guide-handwoven-kashmir',
    title:
      'Cashmere Scarf Guide: How to Choose a Handwoven Kashmir Scarf & Shawl',
    tags: ["Buyer's Guide", 'Style', 'Cashmere', 'Kashmir', 'Pashmina', 'All'],
    summary:
      'A practical Western guide to choosing a handwoven Kashmir cashmere scarf or shawl — sizes, authenticity, and how scarf, stole, shawl, and oversized wrap differ.',
    seoTitle:
      'Cashmere Scarf Guide: Handwoven Kashmir Scarf & Shawl | The Kashmir Weaver',
    seoDescription:
      'How to choose a handwoven Kashmir cashmere scarf or shawl. Compare scarf, stole, shawl, and oversized wrap sizes, check authenticity, and shop Solid Pashmina.',
    body: `
<p>In the US and Europe, “cashmere scarf” has become everyday language for luxury neckwear. In Kashmir, the same fibre — and often the same word shoppers use — lives across several sizes: a narrow stole, a square scarf, a classic shawl, and an oversized wrap. Choosing well means knowing which silhouette you actually need, and how to recognise handwoven Kashmiri cashmere from lookalikes.</p>

<p>This guide is written for Western wardrobes: coats, workwear, weekends, and travel. It uses the size language we weave for our <a href="${SOLIDS}">Solid Pashmina</a> collection so you can match intent to centimetres — not marketing labels alone.</p>

<h2>Scarf, Stole, Shawl, Oversized Wrap: What the Sizes Mean</h2>

<p>Labels vary by brand. At The Kashmir Weaver, solid pieces are offered in clear, wearable formats:</p>

<ul>
<li><strong>Stole / Scarf (70 × 200 cm)</strong> — long and relatively narrow. Ideal under a coat collar, looped once or twice, or worn as a refined office scarf. This is the closest match to what many people in the US and Europe mean by “cashmere scarf.”</li>
<li><strong>Square Scarf (137 × 137 cm)</strong> — a generous square that can fold into a triangle, knot at the neck, or sit as a light shoulder cover. Excellent with blazers and lighter jackets.</li>
<li><strong>Shawl (100 × 200 cm)</strong> — the classic Kashmiri rectangle. Enough fabric for a full shoulder drape, travel wrap, or evening stole. The most versatile “one piece for everything” size.</li>
<li><strong>Oversized Wrap / 3 Yard (137 × 274 cm)</strong> — maximum coverage for cold climates, long flights, and formal occasions where you want fabric to fall generously.</li>
</ul>

<p>If you are building a first piece for Western daily wear, start with the stole/scarf or the classic shawl. Choose the oversized wrap when you know you want cape-like coverage. Choose the square when you style with knots and folded shapes more than open drapes.</p>

<h2>How Western Trends Are Using Cashmere Right Now</h2>

<p>Across US and European street style, cashmere is less about statement logos and more about quiet finish: a cream or soft grey stole with a navy coat, a deep charcoal loop over a white shirt, or a camel shawl thrown over a black dress for evening. Neutrals dominate — cream, ivory, black, navy, soft grey, warm taupe — because they move from office to dinner without feeling costume-y.</p>

<p>The other shift is scale. Shoppers still want a classic scarf length for commuting, but many also want one larger piece that doubles as a wrap on planes and in air-conditioned restaurants. That is why knowing the difference between a 70 × 200 stole and a 100 × 200 shawl matters: one is primarily neckwear; the other becomes outerwear-adjacent.</p>

<h2>Authenticity: What to Look For in Handwoven Kashmir Cashmere</h2>

<p>“Cashmere” on a label is not the same as handwoven Kashmiri Pashmina. Genuine pieces from Kashmir are spun and woven from fine Changthangi goat fibre, typically in the 12–16 micron range for true Pashmina. They feel warm before they feel heavy, drape rather than cling, and recover softness with gentle wear.</p>

<p>Be cautious of:</p>
<ul>
<li>Prices that seem too low for “100% cashmere” of generous size</li>
<li>Overly shiny, slippery fabric that behaves more like rayon than wool</li>
<li>Heavy reliance on the ring test alone (synthetics can pass it)</li>
<li>Vague origin claims with no weaving tradition behind them</li>
</ul>

<p>For a deeper checklist, see our guide on <a href="${STOREFRONT}/journal/how-to-tell-if-pashmina-is-real">how to tell if a Pashmina is real</a>. For fibre distinctions, read <a href="${STOREFRONT}/journal/pashmina-vs-cashmere-actual-difference">Pashmina vs. Cashmere</a>.</p>

<h2>Choosing Colour for a Western Capsule</h2>

<p>If you wear mostly black, navy, denim, and white, begin with cream, soft grey, or camel — they lift dark coats without fighting them. If your wardrobe is lighter and tonal, a navy or charcoal stole adds definition. Cream white remains the most gift-friendly and seasonless option for first-time buyers.</p>

<h2>Care, Briefly</h2>

<p>Handwash cool with a mild wool detergent, or dry clean only when necessary. Dry flat. Store folded, not hanging, in a breathable bag. Properly cared for, a handwoven piece lasts decades — which is why size and authenticity matter more than chasing a trend colour you will tire of in one season.</p>

<hr />
<h2>Shop Solid Pashmina</h2>
<p>Ready to choose? Browse our <a href="${SOLIDS}"><strong>Solid Pashmina collection</strong></a> — handwoven Kashmiri cashmere in stole, scarf, shawl, and oversized wrap sizes. For a classic first piece, see the <a href="${CREAM}">Cream White Cashmere Pashmina</a>.</p>
`.trim(),
  },
  {
    handle: 'how-to-wear-pashmina-shawl-with-abaya',
    title: 'How to Wear a Pashmina Shawl with an Abaya',
    tags: [
      'Style',
      'How to Wear',
      'Modest Fashion',
      'Kashmir',
      'Pashmina',
      'All',
    ],
    summary:
      'Styling tips for wearing a handwoven Kashmiri Pashmina shawl with an abaya — colour pairings, modesty, day-to-evening looks, and when to choose black, cream, or navy.',
    seoTitle:
      'How to Wear a Pashmina Shawl with an Abaya | The Kashmir Weaver',
    seoDescription:
      'Learn how to style a Kashmiri Pashmina shawl with an abaya. Colour ideas (black, cream, navy), modest drapes, evening looks, and shop Solid Pashmina.',
    body: `
<p>An abaya asks for fabric that moves with dignity — enough cover, enough lightness, and a finish that reads intentional rather than improvised. A handwoven Kashmiri Pashmina shawl meets that brief: it drapes cleanly over the shoulders, holds a soft fold without constant adjusting, and adds warmth in air-conditioned spaces or cooler evenings without bulk.</p>

<p>This guide focuses on practical ways to wear Pashmina with an abaya for daily wear, gatherings, and evening occasions — with colour suggestions that work across black, cream, and navy pieces.</p>

<h2>Why Pashmina Works with an Abaya</h2>

<p>Abayas are often fluid and long-lined. Heavy wraps can interrupt that line; thin synthetics can slip or look shiny under soft lighting. Pure handwoven Pashmina sits in between: it has substance you can feel, yet remains light enough to layer over open-front or closed abayas without weighing the silhouette down.</p>

<p>It also travels well. Folded small, a shawl fits in a handbag and becomes evening cover when restaurants run cold — a common need across the Gulf and Levant.</p>

<h2>Three Reliable Drapes</h2>

<h3>1. The Modest Shoulder Wrap</h3>
<p>Open the shawl fully (ideally a classic <strong>100 × 200 cm</strong> shawl). Place it across both shoulders so the fabric covers the upper arms and upper back, with ends falling evenly in front. This is the most formal everyday option — appropriate for visits, prayers after travel, and daytime gatherings.</p>

<h3>2. The Front-Crossed Cover</h3>
<p>Drape the shawl around the back of the neck, cross the ends once at the chest, and let them fall or tuck lightly under the outer edge. This adds coverage at the front while keeping the abaya’s length visible. It works especially well with open-front abayas or lighter fabrics.</p>

<h3>3. The Evening Stole</h3>
<p>Fold the shawl lengthwise once for a cleaner edge. Rest it across the forearms or loosely over one shoulder so embroidery or solid colour is visible when you move. Ideal for dinners and celebrations when you want polish without wrapping tightly.</p>

<p>For more draping ideas that translate well under coats or over formalwear, see our guide to <a href="${STOREFRONT}/journal/eight-practical-ways-to-wear-a-pashmina-shawl">eight practical ways to wear a Pashmina shawl</a>.</p>

<h2>Colour Pairings: Black, Cream, Navy</h2>

<ul>
<li><strong>Black abaya + cream or ivory Pashmina</strong> — the most timeless contrast. Cream softens black without competing; it photographs beautifully and feels festive without loud pattern. Start with our <a href="${CREAM}">Cream White Cashmere Pashmina</a> if you want one versatile piece.</li>
<li><strong>Black abaya + black or deep charcoal Pashmina</strong> — tonal and modern. Best when you want texture rather than contrast: the weave becomes the detail.</li>
<li><strong>Navy abaya + cream or soft grey</strong> — elegant for daytime and travel. Navy already reads refined; cream keeps the look light in heat and under bright indoor lighting.</li>
<li><strong>Cream or light abaya + navy or charcoal shawl</strong> — adds definition at the shoulders and frames the face. Strong for evening when you want a clearer silhouette.</li>
<li><strong>Colourful abaya (jewel tones, embroidery)</strong> — choose a quiet solid Pashmina in black, cream, or soft taupe so the abaya remains the focus.</li>
</ul>

<p>Patterned Kani pieces can work for special occasions, but for daily abaya styling, solids are usually the more flexible choice.</p>

<h2>Day vs Evening</h2>

<p><strong>Day:</strong> Prefer lighter contrast and easier movement — cream or soft grey over black or navy, wrapped for coverage. Keep folds soft rather than sculpted.</p>

<p><strong>Evening:</strong> Allow more fabric to show. A fuller shawl size or a single-shoulder drape reads more elevated. Deep solids (navy, black, rich camel) feel dressier under warm lighting than pale pastels.</p>

<h2>Modesty and Comfort Tips</h2>

<ul>
<li>Choose a classic shawl size when coverage of shoulders and upper arms matters most.</li>
<li>Avoid overly slippery blends; handwoven Pashmina stays put with less pinning.</li>
<li>In hot weather, use the shawl as portable air-conditioning cover indoors rather than outdoor heat layering.</li>
<li>Store folded; steam lightly from a distance if travel wrinkles appear — never high heat directly on the fibre.</li>
</ul>

<hr />
<h2>Shop Solid Pashmina</h2>
<p>Explore colours made for abaya layering in our <a href="${SOLIDS}"><strong>Solid Pashmina collection</strong></a> — handwoven in Kashmir, in sizes from stole to full shawl and oversized wrap. For a classic cream piece, visit the <a href="${CREAM}">Cream White Cashmere Pashmina</a>.</p>
`.trim(),
  },
  {
    handle: 'how-men-wear-cashmere-scarf-pashmina-shawl',
    title: 'How Men Wear a Handwoven Cashmere Scarf & Pashmina Shawl',
    tags: [
      'Style',
      "Buyer's Guide",
      'How to Wear',
      'Cashmere',
      'Kashmir',
      'Pashmina',
      'Men',
      'All',
    ],
    summary:
      'A practical guide for men on choosing and wearing a handwoven Kashmir cashmere scarf or pashmina shawl — sizes, colours, office looks, coats, and travel.',
    seoTitle:
      'How Men Wear a Cashmere Scarf & Pashmina Shawl | The Kashmir Weaver',
    seoDescription:
      'How men choose and wear a handwoven Kashmir cashmere scarf or pashmina shawl. Sizes, colours, coat styling, office and travel looks, plus shop Solid Pashmina.',
    body: `
<p>In the US and Europe, “cashmere scarf” is the phrase most men type when they want better neckwear than a stiff wool muffler. In Kashmir, that same fibre — fine Changthangi pashm, hand-spun and handwoven — is offered as a stole, scarf, shawl, or oversized wrap. The difference is not marketing. It is centimetres, drape, and how the piece sits under a coat.</p>

<p>This guide is for men building a first serious scarf or upgrading from machine-knit cashmere. It focuses on solid, unembellished pieces from our <a href="${SOLIDS}">Solid Pashmina</a> collection: quiet luxury that reads as texture and finish, not pattern or logo.</p>

<h2>Scarf vs Shawl: Which Size Men Should Buy First</h2>

<p>Labels vary by brand. For men’s wardrobes, start with size, not buzzwords.</p>

<ul>
<li><strong>Stole / scarf (about 70 × 200 cm)</strong> — The closest match to what most men mean by “cashmere scarf.” Long enough to loop once under a coat collar, narrow enough to avoid bulk at the shoulders. Best for commuting, offices, and daily wear.</li>
<li><strong>Classic shawl (about 100 × 200 cm)</strong> — More fabric across the chest and shoulders. Ideal if you want one piece that doubles as a travel wrap, evening cover over a blazer, or blanket on a cold flight.</li>
<li><strong>Oversized wrap</strong> — Maximum coverage for deep winter or long-haul travel. Choose this when you already know you want cape-like warmth, not as a first everyday scarf.</li>
</ul>

<p>If you are buying one piece for Western city winters, begin with the stole/scarf. Add a classic shawl when you travel often or want evening drape over a suit. For a fuller size breakdown, see our <a href="${STOREFRONT}/journal/cashmere-scarf-guide-handwoven-kashmir">cashmere scarf guide</a>.</p>

<h2>How Men Actually Wear It</h2>

<h3>Under the coat collar</h3>
<p>Fold the stole lengthwise once for a cleaner edge. Drape evenly around the neck so both ends fall inside the overcoat. This is the most polished office look — warmth without a thick knot fighting the lapels.</p>

<h3>The single loop</h3>
<p>Fold in half, place behind the neck, and pull the loose ends through the loop. Secure in wind, neat with a peacoat or trench, and easy to loosen indoors.</p>

<h3>Open drape over a blazer</h3>
<p>Use a classic shawl. Rest it across both shoulders with ends hanging evenly in front, or toss one end over the opposite shoulder. Works for dinners, galleries, and cool restaurants when you leave the coat at the door.</p>

<h3>Travel wrap</h3>
<p>Wear the stole looped through the airport. Once the cabin cools, open a shawl fully across the chest and lap. Handwoven pashmina packs small and recovers softness better than airline synthetics.</p>

<p>For more draping ideas that translate well for anyone, see <a href="${STOREFRONT}/journal/eight-practical-ways-to-wear-a-pashmina-shawl">eight practical ways to wear a pashmina shawl</a>.</p>

<h2>Colours That Work in a Men’s Capsule</h2>

<p>Men’s coats are mostly navy, charcoal, camel, black, and olive. Your scarf should either match that quiet register or lift it slightly.</p>

<ul>
<li><strong>Charcoal, slate, and deep taupe</strong> — The safest everyday choices. They disappear into dark coats while still showing the weave up close.</li>
<li><strong>Navy</strong> — Excellent with grey flannel, denim, and camel. Strong for office weeks.</li>
<li><strong>Cream or soft ivory</strong> — The contrast piece. Against a navy or black coat it reads intentional without looking loud. Also the most gift-friendly neutral. Start with our <a href="${CREAM}">Cream White Cashmere Pashmina</a> if you want one versatile gift.</li>
<li><strong>Black</strong> — Tonal and modern with black outerwear. Best when you want texture, not colour.</li>
<li><strong>Warm camel or khaki brown</strong> — Natural with olive field jackets and tan coats; softer than pure white against skin tones that prefer warmth.</li>
</ul>

<p>For a first purchase, charcoal/slate or navy will get the most wear. Cream is the better gift when you do not know the recipient’s coat colour.</p>

<h2>Office, Weekend, Evening</h2>

<p><strong>Office:</strong> Prefer a stole in charcoal, navy, or taupe. Keep the drape inside the coat or in a single neat loop. Avoid heavy embroidery for daily boardrooms; solids signal quiet luxury.</p>

<p><strong>Weekend:</strong> Pair the same stole with a crewneck sweater and denim, or a chore jacket. A slightly looser loop looks less formal without looking careless.</p>

<p><strong>Evening:</strong> Switch to a classic shawl over a dark blazer or turtleneck. An open shoulder drape photographs cleanly and feels more deliberate than a tight scarf knot.</p>

<h2>Why Handwoven Kashmir Beats Generic “Cashmere”</h2>

<p>Many men’s scarves labelled cashmere are machine-knit from commercial grades. Handwoven Kashmiri pashmina is spun from fine Himalayan Changthangi fibre (typically in the 12–16 micron range for true pashm), woven on traditional looms in Kashmir. It should feel warm before it feels heavy, drape rather than cling, and improve with gentle wear rather than pill into a fuzzy ball in one season.</p>

<p>Be wary of prices that seem too low for a generous “100% cashmere” size, overly shiny fabric, and vague origin claims. For a practical authenticity checklist, see <a href="${STOREFRONT}/journal/how-to-tell-if-pashmina-is-real">how to tell if a pashmina is real</a>. For fibre language, read <a href="${STOREFRONT}/journal/pashmina-vs-cashmere-actual-difference">pashmina vs cashmere</a>.</p>

<h2>Care, Briefly</h2>

<p>Handwash cool with a mild wool detergent when needed, or dry clean sparingly. Dry flat. Store folded in a breathable bag — never hanging long-term from a hook, which can stretch the weave. A well-chosen solid piece should last decades of winters, which is why size and fibre quality matter more than chasing a trend colour.</p>

<hr />
<h2>Shop Solid Pashmina</h2>
<p>True men’s style with cashmere is not about making a statement. It is about finishing a coat the way a good watch finishes a wrist: quiet, warm, and built to be used. Browse our <a href="${SOLIDS}"><strong>Solid Pashmina collection</strong></a> — handwoven Kashmiri cashmere in stole, shawl, and wrap sizes. Start with charcoal, slate, navy, or our <a href="${CREAM}">Cream White Cashmere Pashmina</a> for the most wearable first piece.</p>
`.trim(),
  },
];

async function getJournalBlogId(): Promise<string> {
  const data = await adminGraphql<{
    blogs: {edges: Array<{node: {id: string; handle: string}}>};
  }>(`query { blogs(first: 20) { edges { node { id handle } } } }`);
  const blog = data.blogs.edges.find((e) => e.node.handle === 'journal');
  if (!blog) throw new Error('journal blog not found');
  return blog.node.id;
}

async function getArticleByHandle(handle: string) {
  const data = await adminGraphql<{
    articles: {
      nodes: Array<{
        id: string;
        handle: string;
        title: string;
        body: string;
        tags: string[];
      }>;
    };
  }>(
    `#graphql
    query($q: String!) {
      articles(first: 1, query: $q) {
        nodes { id handle title body tags }
      }
    }`,
    {q: `handle:${handle}`},
  );
  return data.articles.nodes[0] ?? null;
}

async function updateArticleBody(id: string, body: string) {
  const result = await adminGraphql<{
    articleUpdate: {
      article: {handle: string} | null;
      userErrors: Array<{message: string}>;
    };
  }>(
    `#graphql
    mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!) {
      articleUpdate(id: $id, article: $article) {
        article { handle }
        userErrors { message }
      }
    }`,
    {id, article: {body}},
  );
  if (result.articleUpdate.userErrors.length) {
    throw new Error(result.articleUpdate.userErrors[0].message);
  }
}

async function createArticle(
  blogId: string,
  article: (typeof NEW_ARTICLES)[number],
) {
  const result = await adminGraphql<{
    articleCreate: {
      article: {id: string; handle: string} | null;
      userErrors: Array<{message: string}>;
    };
  }>(
    `#graphql
    mutation CreateArticle($article: ArticleCreateInput!) {
      articleCreate(article: $article) {
        article { id handle }
        userErrors { message }
      }
    }`,
    {
      article: {
        blogId,
        title: article.title,
        handle: article.handle,
        author: {name: 'The Kashmir Weaver'},
        body: article.body,
        summary: article.summary,
        tags: article.tags,
        isPublished: true,
        publishDate: new Date().toISOString(),
        metafields: [
          {
            namespace: 'global',
            key: 'title_tag',
            type: 'single_line_text_field',
            value: article.seoTitle,
          },
          {
            namespace: 'global',
            key: 'description_tag',
            type: 'single_line_text_field',
            value: article.seoDescription,
          },
        ],
      },
    },
  );
  if (result.articleCreate.userErrors.length) {
    throw new Error(result.articleCreate.userErrors[0].message);
  }
  if (!result.articleCreate.article) {
    throw new Error('articleCreate returned no article');
  }
  return result.articleCreate.article;
}

async function main() {
  console.log(`\nJournal CTAs + 2 new posts → ${SHOP}\n`);
  const blogId = await getJournalBlogId();
  console.log(`Journal blog: ${blogId}\n`);

  const ctaResults: Array<{
    handle: string;
    status: 'updated' | 'skipped' | 'missing' | 'failed';
    detail: string;
  }> = [];

  console.log('--- Updating CTAs on priority articles ---\n');
  for (const [handle, cfg] of Object.entries(PRIORITY_CTAS)) {
    try {
      const article = await getArticleByHandle(handle);
      if (!article) {
        console.log(`  · missing ${handle}`);
        ctaResults.push({handle, status: 'missing', detail: 'not found'});
        continue;
      }
      if (article.body.includes('/collections/solids')) {
        console.log(`  · skip ${handle} (already links solids)`);
        ctaResults.push({
          handle,
          status: 'skipped',
          detail: 'already has solids link',
        });
        continue;
      }
      const newBody = `${article.body.trim()}\n${cfg.build()}`;
      await updateArticleBody(article.id, newBody);
      console.log(`  ✓ updated ${handle} (${cfg.note})`);
      ctaResults.push({handle, status: 'updated', detail: cfg.note});
    } catch (err) {
      const msg = (err as Error).message;
      console.log(`  ✗ ${handle}: ${msg}`);
      ctaResults.push({handle, status: 'failed', detail: msg});
    }
    await sleep(400);
  }

  console.log('\n--- Creating 2 new articles ---\n');
  const createResults: Array<{
    handle: string;
    status: 'created' | 'exists' | 'failed';
    detail: string;
    url?: string;
  }> = [];

  for (const article of NEW_ARTICLES) {
    try {
      const existing = await getArticleByHandle(article.handle);
      if (existing) {
        console.log(`  · exists ${article.handle} — leaving as-is`);
        createResults.push({
          handle: article.handle,
          status: 'exists',
          detail: existing.id,
          url: `${STOREFRONT}/journal/${article.handle}`,
        });
        continue;
      }
      const created = await createArticle(blogId, article);
      console.log(`  ✓ created ${created.handle}`);
      createResults.push({
        handle: created.handle,
        status: 'created',
        detail: created.id,
        url: `${STOREFRONT}/journal/${created.handle}`,
      });
    } catch (err) {
      const msg = (err as Error).message;
      console.log(`  ✗ ${article.handle}: ${msg}`);
      createResults.push({
        handle: article.handle,
        status: 'failed',
        detail: msg,
      });
    }
    await sleep(400);
  }

  console.log('\n========== SUMMARY ==========');
  console.log('\nCTAs:');
  for (const r of ctaResults) {
    console.log(`  [${r.status}] ${r.handle} — ${r.detail}`);
  }
  console.log('\nNew posts:');
  for (const r of createResults) {
    console.log(
      `  [${r.status}] ${r.handle}${r.url ? ` → ${r.url}` : ''} — ${r.detail}`,
    );
  }
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
