/**
 * Backfills journal articles that have a featured image but no `<img>` in
 * the body HTML: embeds the featured image after the first paragraph so
 * Hydrogen renders it between text.
 *
 * Idempotent — articles that already contain an `<img>` are skipped.
 *
 * Run:  npm run embed:journal-images
 * Dry:  npm run embed:journal-images -- --dry-run
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {embedImageInBodyHtml} from './lib/journal-body-image.ts';

const API_VERSION = '2025-01';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile() {
  const envPath = resolve(ROOT, '.env');
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

type AdminResponse<T> = {data?: T; errors?: Array<{message: string}>};

async function adminGraphql<T>(
  shop: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
    },
  );
  const json = (await res.json()) as AdminResponse<T>;
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  if (!json.data) throw new Error('GraphQL response missing data');
  return json.data;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ArticleNode = {
  id: string;
  handle: string;
  title: string;
  body: string;
  image?: {url?: string | null; altText?: string | null} | null;
};

async function getJournalBlogId(shop: string, token: string): Promise<string> {
  const data = await adminGraphql<{
    blogs: {edges: Array<{node: {id: string; handle: string}}>};
  }>(shop, token, `query { blogs(first: 20) { edges { node { id handle } } } }`);
  const blog = data.blogs.edges.find((e) => e.node.handle === 'journal');
  if (!blog) throw new Error('Journal blog not found (handle: journal)');
  return blog.node.id;
}

async function listArticles(
  shop: string,
  token: string,
  blogId: string,
): Promise<ArticleNode[]> {
  const out: ArticleNode[] = [];
  let cursor: string | null = null;
  do {
    const data = await adminGraphql<{
      blog: {
        articles: {
          pageInfo: {hasNextPage: boolean; endCursor: string | null};
          nodes: ArticleNode[];
        };
      } | null;
    }>(
      shop,
      token,
      `#graphql
      query JournalArticles($blogId: ID!, $first: Int!, $after: String) {
        blog(id: $blogId) {
          articles(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              handle
              title
              body
              image { url altText }
            }
          }
        }
      }`,
      {blogId, first: 50, after: cursor},
    );
    const nodes = data.blog?.articles.nodes ?? [];
    out.push(...nodes);
    const info = data.blog?.articles.pageInfo;
    cursor = info?.hasNextPage ? (info.endCursor ?? null) : null;
  } while (cursor);
  return out;
}

async function updateBody(
  shop: string,
  token: string,
  id: string,
  body: string,
): Promise<void> {
  const result = await adminGraphql<{
    articleUpdate: {userErrors: Array<{message: string}>};
  }>(
    shop,
    token,
    `#graphql
    mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!) {
      articleUpdate(id: $id, article: $article) {
        userErrors { message }
      }
    }`,
    {id, article: {body}},
  );
  if (result.articleUpdate.userErrors.length) {
    throw new Error(result.articleUpdate.userErrors[0].message);
  }
}

async function main() {
  loadEnvFile();
  const shop = process.env.PUBLIC_STORE_DOMAIN ?? '';
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
  if (!shop || !token) {
    console.error(
      'Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in .env',
    );
    process.exit(1);
  }

  const dryRun = process.argv.includes('--dry-run');
  console.log(
    `\nEmbedding featured images into journal body HTML on ${shop}${dryRun ? ' (dry-run)' : ''}…\n`,
  );

  const blogId = await getJournalBlogId(shop, token);
  const articles = await listArticles(shop, token, blogId);
  console.log(`Found ${articles.length} article(s)\n`);

  let updated = 0;
  let skippedHasImg = 0;
  let skippedNoFeatured = 0;
  let failed = 0;

  for (const article of articles) {
    const imageUrl = article.image?.url?.trim();
    if (!imageUrl) {
      skippedNoFeatured++;
      console.log(`  · skip ${article.handle}: no featured image`);
      continue;
    }
    if (/<img\b/i.test(article.body ?? '')) {
      skippedHasImg++;
      console.log(`  · skip ${article.handle}: body already has <img>`);
      continue;
    }

    const nextBody = embedImageInBodyHtml(
      article.body ?? '',
      imageUrl,
      article.image?.altText || article.title,
    );

    if (nextBody === (article.body ?? '').trim()) {
      skippedHasImg++;
      console.log(`  · skip ${article.handle}: no change`);
      continue;
    }

    if (dryRun) {
      console.log(`  ○ would update ${article.handle}`);
      updated++;
      continue;
    }

    try {
      await updateBody(shop, token, article.id, nextBody);
      console.log(`  ✓ updated ${article.handle}`);
      updated++;
    } catch (err) {
      failed++;
      console.log(`  · ${article.handle}: ${(err as Error).message}`);
    }
    await sleep(400);
  }

  console.log(
    `\nSummary: ${updated} ${dryRun ? 'would update' : 'updated'} · ${skippedHasImg} already had img · ${skippedNoFeatured} no featured · ${failed} failed\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
