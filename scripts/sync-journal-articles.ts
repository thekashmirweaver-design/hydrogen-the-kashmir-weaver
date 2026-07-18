/**
 * Syncs active journal blog articles in Shopify Admin:
 *   - Category tags (Heritage, Craft, Style, Travel, Luxury Living)
 *   - Full body HTML from static catalog (with featured image embedded mid-body)
 *   - Publish dates and excerpts
 *
 * Run: npm run sync:journal
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {POSTS, ARTICLES} from '../app/models/static/journal.ts';
import {embedImageInBodyHtml} from './lib/journal-body-image.ts';

function loadEnvFile() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
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

const SHOP =
  process.env.PUBLIC_STORE_DOMAIN ??
  process.env.SHOPIFY_STORE_DOMAIN ??
  '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
const BASE_URL = (process.env.PUBLIC_STORE_URL ?? '').replace(/\/$/, '');
const API_VERSION = '2025-01';

if (!SHOP || !TOKEN || !BASE_URL) {
  console.error(
    'Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN, PUBLIC_STORE_URL',
  );
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function assetUrl(path: string): string {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function bodyHtmlForSlug(slug: string, excerpt: string): string {
  const article = ARTICLES[slug];
  if (article?.body?.length) {
    return article.body.map((p) => `<p>${p}</p>`).join('');
  }
  return `<p>${excerpt}</p>`;
}

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

  if (!res.ok) {
    throw new Error(`Admin API ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as {data?: T; errors?: Array<{message: string}>};
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data as T;
}

async function getJournalBlogId(): Promise<string | null> {
  const data = await adminGraphql<{
    blogs: {edges: Array<{node: {id: string; handle: string}}>};
  }>(`query { blogs(first: 20) { edges { node { id handle } } } }`);

  return data.blogs.edges.find((e) => e.node.handle === 'journal')?.node.id ?? null;
}

async function listJournalArticles(blogId: string) {
  const data = await adminGraphql<{
    blog: {
      articles: {
        nodes: Array<{
          id: string;
          handle: string;
          tags: string[];
          isPublished: boolean;
        }>;
      };
    } | null;
  }>(
    `#graphql
    query JournalArticles($blogId: ID!) {
      blog(id: $blogId) {
        articles(first: 50) {
          nodes {
            id
            handle
            tags
            isPublished
          }
        }
      }
    }`,
    {blogId},
  );

  return data.blog?.articles.nodes ?? [];
}

async function upsertArticle(
  blogId: string,
  existingId: string | undefined,
  post: (typeof POSTS)[number],
) {
  const imageUrl = assetUrl(post.img);
  const bodyHtml = embedImageInBodyHtml(
    bodyHtmlForSlug(post.slug, post.excerpt),
    imageUrl,
    post.title,
  );
  const tags = [post.cat];

  if (existingId) {
    const result = await adminGraphql<{
      articleUpdate: {
        article: {handle: string; tags: string[]};
        userErrors: Array<{message: string}>;
      };
    }>(
      `#graphql
      mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!) {
        articleUpdate(id: $id, article: $article) {
          article { handle tags }
          userErrors { message }
        }
      }`,
      {
        id: existingId,
        article: {
          title: post.title,
          body: bodyHtml,
          summary: post.excerpt,
          tags,
          isPublished: true,
          publishDate: post.date,
          image: {url: imageUrl, altText: post.title},
        },
      },
    );

    if (result.articleUpdate.userErrors.length) {
      throw new Error(result.articleUpdate.userErrors[0].message);
    }

    console.log(`  ✓ updated ${post.slug} [${tags.join(', ')}]`);
    return;
  }

  const result = await adminGraphql<{
    articleCreate: {
      article: {handle: string};
      userErrors: Array<{message: string}>;
    };
  }>(
    `#graphql
    mutation CreateArticle($article: ArticleCreateInput!) {
      articleCreate(article: $article) {
        article { handle }
        userErrors { message }
      }
    }`,
    {
      article: {
        blogId,
        title: post.title,
        handle: post.slug,
        author: {name: 'The Kashmir Weaver'},
        body: bodyHtml,
        summary: post.excerpt,
        tags,
        isPublished: true,
        publishDate: post.date,
        image: {url: imageUrl, altText: post.title},
      },
    },
  );

  if (result.articleCreate.userErrors.length) {
    throw new Error(result.articleCreate.userErrors[0].message);
  }

  console.log(`  ✓ created ${post.slug} [${tags.join(', ')}]`);
}

async function main() {
  console.log(`\nSyncing journal articles on ${SHOP}…\n`);

  const blogId = await getJournalBlogId();
  if (!blogId) {
    console.error('Journal blog not found (handle: journal). Run npm run seed:shopify first.');
    process.exit(1);
  }

  const existing = await listJournalArticles(blogId);
  const byHandle = new Map(existing.map((a) => [a.handle, a]));

  const active = existing.filter((a) => a.isPublished);
  console.log(`Found ${existing.length} articles (${active.length} published)\n`);

  for (const post of POSTS) {
    const match = byHandle.get(post.slug);
    try {
      await upsertArticle(blogId, match?.id, post);
    } catch (err) {
      console.log(`  · ${post.slug}: ${(err as Error).message}`);
    }
    await sleep(400);
  }

  const extra = active.filter(
    (a) => !POSTS.some((p) => p.slug === a.handle),
  );
  if (extra.length) {
    console.log('\nPublished articles not in static catalog (skipped):');
    for (const a of extra) {
      console.log(`  · ${a.handle} (tags: ${a.tags.join(', ') || 'none'})`);
    }
  }

  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
