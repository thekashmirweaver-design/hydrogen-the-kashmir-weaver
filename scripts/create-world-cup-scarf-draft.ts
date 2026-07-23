/**
 * Creates a draft journal article from the World Cup scarf-trend post.
 * Run: npx tsx scripts/create-world-cup-scarf-draft.ts
 */
import {existsSync, readFileSync} from 'node:fs';
import https from 'node:https';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const API_VERSION = '2025-01';
const STOREFRONT = 'https://thekashmirweaver.shop';
const SOLIDS = `${STOREFRONT}/collections/solids`;
const KANI = `${STOREFRONT}/collections/kani`;
const FEATURED = `${STOREFRONT}/collections/homepage-featured`;
const ALL = `${STOREFRONT}/collections/all`;

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
    process.env[key] = value;
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
  const body = JSON.stringify({query, variables});
  const json = await new Promise<AdminResponse<T>>((resolvePromise, reject) => {
    const req = https.request(
      {
        hostname: SHOP,
        path: `/admin/api/${API_VERSION}/graphql.json`,
        method: 'POST',
        family: 4,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': TOKEN,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolvePromise(JSON.parse(data) as AdminResponse<T>);
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  if (json.errors) {
    const msg = Array.isArray(json.errors)
      ? json.errors.map((e) => e.message).join('; ')
      : String(json.errors);
    throw new Error(msg);
  }
  if (!json.data) throw new Error('GraphQL response missing data');
  return json.data;
}

const ARTICLE = {
  handle: 'world-cup-jersey-scarf-trend-pashmina-wraps',
  title:
    "How the World Cup's Jersey-and-Scarf Trend Is Changing the Way We Wear Wraps",
  tags: ['Style', 'How to Wear', 'Pashmina', 'Cashmere', 'Kashmir', 'All'],
  summary:
    'World Cup street style is pairing jerseys with scarves and wraps. Why a handwoven pashmina beats a synthetic team scarf — and three ways to wear it this season.',
  seoTitle:
    "World Cup Jersey & Scarf Trend: How to Wear Wraps | The Kashmir Weaver",
  seoDescription:
    'How the 2026 World Cup jersey-and-scarf trend is changing wrap styling. Why a handwoven pashmina beats a synthetic scarf, plus three ways to wear it.',
  body: `
<p>There's a moment in every football fan's closet where the jersey stops being just a jersey. Maybe it happened at a watch party. Maybe it happened scrolling through match-day street style. Either way, 2026 has been the year fans stopped treating the shirt as a stadium-only item and started building whole outfits around it — jerseys under trench coats, jerseys with rugby collars, jerseys paired with a scarf thrown over one shoulder instead of tied around the neck.</p>

<p>That last detail is the one worth paying attention to.</p>

<h2>The Scarf Was Always There</h2>

<p>Football and scarves have never really been separate. Long before "blokecore" had a name, fans wore team scarves as a badge of belonging — knitted, screen-printed, handed down. What's changed this year is how those scarves are being worn. They're no longer just a cold-weather necessity for the terraces. They're doing double duty as a styling piece — draped, knotted, layered over a jersey the way you'd style a silk scarf over a blazer.</p>

<p>That shift — from "functional fan gear" to "considered styling piece" — is exactly the gap a pashmina fills better than anything else in a fan's wardrobe.</p>

<h2>Why a Handwoven Wrap Beats a Synthetic Scarf</h2>

<p>A polyester team scarf does one job: it says who you support. A pashmina does that job and three more:</p>

<ul>
<li><strong>It actually keeps you warm.</strong> Late-tournament matches and evening kickoffs get cold fast, especially if you're standing for two hours. Fine Kashmiri wool holds heat without the bulk of a padded jacket.</li>
<li><strong>It moves with an outfit, not against it.</strong> Drape it over a jersey the way stylists are draping silk scarves this season, and you get the same "elevated fan" look the style press has been writing about — without needing a designer collab price tag.</li>
<li><strong>It outlasts the tournament.</strong> A team scarf is single-purpose. A well-made wrap goes from match day to travel days to everyday wear once the final whistle blows.</li>
</ul>

<h2>Three Ways to Wear It This Season</h2>

<h3>1. Over the shoulder, jersey underneath</h3>
<p>Skip tying it around your neck. Let it fall loosely over one shoulder, jersey visible underneath. This is the exact silhouette turning up across World Cup street style coverage this year — casual, but clearly considered.</p>

<h3>2. Knotted at the front, layered with a jacket</h3>
<p>For colder kickoffs, tuck a lightweight pashmina under an open jacket or coat and let the ends hang loose at the front. It reads as intentional layering, not an afterthought.</p>

<h3>3. Folded as a lap wrap for the stands</h3>
<p>Not every use has to be around your neck. Folded in a square across your lap during a long, cold match, it does the job a stadium blanket usually does — just better looking in every photo taken that day.</p>

<h2>The Takeaway</h2>

<p>The World Cup didn't invent the idea of dressing up fan gear — but it's given it real momentum this year, with jerseys showing up under trench coats and next to silk scarves in a way that used to be reserved for high fashion. A handwoven pashmina slots into that trend naturally: it's warmer, better made, and it doesn't stop being useful once the tournament ends.</p>

<p>If you've been eyeing the layered, elevated version of match-day style, this is the easiest way in.</p>

<hr />
<h2>Shop The Kashmir Weaver</h2>
<p>Shop the layering edit — handwoven pashmina wraps made for wearing well beyond one season.</p>
<ul>
<li><a href="${SOLIDS}"><strong>Solid Pashmina →</strong></a> Quiet colours and everyday drape for jersey-and-scarf layering.</li>
<li><a href="${KANI}"><strong>Kani Pashmina →</strong></a> Heritage woven florals when you want the wrap to be the statement.</li>
<li><a href="${FEATURED}"><strong>Featured Pieces →</strong></a> A curated edit of current favourites.</li>
<li><a href="${ALL}"><strong>Shop everything →</strong></a> Browse the full Kashmir Weaver collection.</li>
</ul>
`.trim(),
};

async function getJournalBlogId(): Promise<string> {
  const data = await adminGraphql<{
    blogs: {edges: Array<{node: {id: string; handle: string}}>};
  }>(`query { blogs(first: 20) { edges { node { id handle } } } }`);
  const existing = data.blogs.edges.find((e) => e.node.handle === 'journal');
  if (!existing) {
    throw new Error('Journal blog not found');
  }
  return existing.node.id;
}

async function getArticleByHandle(handle: string) {
  const data = await adminGraphql<{
    articles: {
      nodes: Array<{id: string; handle: string; isPublished: boolean}>;
    };
  }>(
    `#graphql
    query($q: String!) {
      articles(first: 1, query: $q) {
        nodes { id handle isPublished }
      }
    }`,
    {q: `handle:${handle}`},
  );
  return data.articles.nodes[0] ?? null;
}

async function main() {
  console.log(`\nUpserting draft journal article → ${SHOP}\n`);

  const existing = await getArticleByHandle(ARTICLE.handle);
  if (existing) {
    const result = await adminGraphql<{
      articleUpdate: {
        article: {id: string; handle: string; isPublished: boolean} | null;
        userErrors: Array<{field?: string[]; message: string}>;
      };
    }>(
      `#graphql
      mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!) {
        articleUpdate(id: $id, article: $article) {
          article { id handle isPublished }
          userErrors { field message }
        }
      }`,
      {
        id: existing.id,
        article: {
          title: ARTICLE.title,
          body: ARTICLE.body,
          summary: ARTICLE.summary,
          tags: ARTICLE.tags,
          isPublished: false,
          metafields: [
            {
              namespace: 'global',
              key: 'title_tag',
              type: 'single_line_text_field',
              value: ARTICLE.seoTitle,
            },
            {
              namespace: 'global',
              key: 'description_tag',
              type: 'single_line_text_field',
              value: ARTICLE.seoDescription,
            },
          ],
        },
      },
    );
    if (result.articleUpdate.userErrors.length) {
      throw new Error(
        result.articleUpdate.userErrors
          .map((e) => `${e.field?.join('.') ?? ''}: ${e.message}`)
          .join('; '),
      );
    }
    const article = result.articleUpdate.article;
    if (!article) throw new Error('articleUpdate returned no article');
    console.log('\n✓ Draft updated (full shop CTA)');
    console.log(`  ID:      ${article.id}`);
    console.log(`  Handle:  ${article.handle}`);
    console.log(`  SEO URL: ${STOREFRONT}/journal/${article.handle}`);
    return;
  }

  const blogId = await getJournalBlogId();
  console.log(`Journal blog: ${blogId}`);

  const result = await adminGraphql<{
    articleCreate: {
      article: {
        id: string;
        handle: string;
        title: string;
        isPublished: boolean;
      } | null;
      userErrors: Array<{field?: string[]; message: string}>;
    };
  }>(
    `#graphql
    mutation CreateArticle($article: ArticleCreateInput!) {
      articleCreate(article: $article) {
        article {
          id
          handle
          title
          isPublished
        }
        userErrors { field message }
      }
    }`,
    {
      article: {
        blogId,
        title: ARTICLE.title,
        handle: ARTICLE.handle,
        author: {name: 'The Kashmir Weaver'},
        body: ARTICLE.body,
        summary: ARTICLE.summary,
        tags: ARTICLE.tags,
        isPublished: false,
        metafields: [
          {
            namespace: 'global',
            key: 'title_tag',
            type: 'single_line_text_field',
            value: ARTICLE.seoTitle,
          },
          {
            namespace: 'global',
            key: 'description_tag',
            type: 'single_line_text_field',
            value: ARTICLE.seoDescription,
          },
        ],
      },
    },
  );

  if (result.articleCreate.userErrors.length) {
    throw new Error(
      result.articleCreate.userErrors
        .map((e) => `${e.field?.join('.') ?? ''}: ${e.message}`)
        .join('; '),
    );
  }

  const article = result.articleCreate.article;
  if (!article) throw new Error('articleCreate returned no article');

  const seoUrl = `${STOREFRONT}/journal/${article.handle}`;
  console.log('\n✓ Draft created');
  console.log(`  ID:        ${article.id}`);
  console.log(`  Title:     ${article.title}`);
  console.log(`  Handle:    ${article.handle}`);
  console.log(`  Published: ${article.isPublished}`);
  console.log(`  SEO URL:   ${seoUrl}`);
  console.log(`  Admin URL: https://${SHOP}/admin/articles/${article.id.split('/').pop()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
