/**
 * Uploads blog articles from the `Blogs/` folder into the Shopify `journal`
 * blog. Articles with a local hero image get that image uploaded via the
 * Files API and attached. Articles without an image go up text-only.
 *
 * Existing articles on the journal blog (the 7 seeded by `seed:shopify`) are
 * left untouched; this script only upserts by handle, so re-running is safe.
 *
 * Folder conventions supported:
 *   Blogs/N/index.txt                  (with or without sibling image)
 *   Blogs/N.txt
 *
 * Skipped:
 *   Blogs/N/ with no `index.txt`
 *   Blogs/7/  (exact duplicate of Blogs/6/)
 *
 * Run: npm run upload:blogs
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {basename, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const API_VERSION = '2025-01';
const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const BLOGS_DIR = resolve(ROOT, 'Blogs');
const PROGRESS_FILE = resolve(ROOT, 'upload-blogs-progress.json');

type JournalCategory =
  | 'Heritage'
  | 'Craft'
  | 'Style'
  | 'Travel'
  | 'Literature'
  | 'Luxury Living';

type ParsedBlog = {
  source: string;
  title: string;
  handle: string;
  excerpt: string;
  altText: string;
  bodyHtml: string;
  imagePath: string | null;
};

const CATEGORY_MAP: Record<string, JournalCategory> = {
  'journey-of-pashm-ladakh-to-wardrobe': 'Heritage',
  '5-elegant-ways-to-drape-pashmina-winter-wedding': 'Style',
  'what-is-kashmiri-pashmina-gi-tag': 'Heritage',
  'pashmina-vs-cashmere-actual-difference': 'Heritage',
  'what-is-kani-weaving-kashmiri-shawl': 'Craft',
  'decoding-sozni-embroidery-kashmiri-pashmina': 'Craft',
  'machine-spun-vs-hand-spun-pashmina': 'Craft',
  'luxury-bridal-trousseau-kashmiri-pashmina': 'Luxury Living',
  'corporate-luxury-gifting-kashmiri-pashmina': 'Luxury Living',
  'can-you-dry-clean-kashmiri-pashmina': 'Style',
  'why-is-real-kashmiri-pashmina-expensive': 'Heritage',
  'what-is-chashm-e-bulbul-diamond-weave': 'Craft',
  'how-to-iron-remove-wrinkles-pashmina': 'Style',
  'history-of-kashmiri-pashmina-shawl': 'Heritage',
  'how-to-fix-snags-pashmina-shawl': 'Style',
  'ultimate-mothers-day-gift-kashmiri-pashmina': 'Luxury Living',
  'how-to-style-pashmina-everyday-luxury': 'Style',
};

const SKIP_FOLDERS = new Set(['4', '7']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const PUBLISH_DATE = '2026-07-08';

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

function mimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

type AdminResponse<T> = {data?: T; errors?: Array<{message: string}>};

async function adminGraphql<T>(
  shop: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({query, variables}),
  });
  const json = (await res.json()) as AdminResponse<T>;
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  if (!json.data) throw new Error('GraphQL response missing data');
  return json.data;
}

function parseBlogFile(filePath: string): ParsedBlog | null {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let title = '';
  let handle = '';
  let excerpt = '';
  let altText = '';
  let bodyStart = -1;
  let titleSeenCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('Title: ')) {
      title = line.slice(7).trim();
      titleSeenCount++;
      continue;
    }
    if (line.startsWith('URL Handle: ')) {
      handle = line.slice(12).trim().replace(/^\//, '');
      continue;
    }
    if (line.startsWith('Excerpt (Summary): ')) {
      excerpt = line.slice(20).trim();
      continue;
    }
    const heroMatch = line.match(/^Hero Image \([^)]+\): (.+)$/);
    if (heroMatch && !altText) {
      altText = heroMatch[1].trim();
      continue;
    }
    if (
      title &&
      line.trim() === title &&
      titleSeenCount === 1
    ) {
      titleSeenCount++;
      bodyStart = i + 1;
    }
  }

  if (!title || !handle) {
    console.log(`  · skip ${basename(filePath)}: missing Title or URL Handle`);
    return null;
  }

  const bodyText =
    bodyStart >= 0 ? lines.slice(bodyStart).join('\n').trim() : '';
  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const bodyHtml = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');

  let imagePath: string | null = null;
  const dir = resolve(filePath, '..');
  if (existsSync(dir)) {
    const siblings = readdirSync(dir);
    const img = siblings.find((s) =>
      IMAGE_EXTS.has(extname(s).toLowerCase()),
    );
    if (img) imagePath = resolve(dir, img);
  }

  return {source: filePath, title, handle, excerpt, altText, bodyHtml, imagePath};
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function discoverBlogs(): Array<{textFile: string; skip: boolean}> {
  const entries = readdirSync(BLOGS_DIR);
  const out: Array<{textFile: string; skip: boolean}> = [];

  for (const entry of entries.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}))) {
    const full = resolve(BLOGS_DIR, entry);
    const stat = statSync(full);
    if (stat.isFile() && entry.endsWith('.txt')) {
      out.push({textFile: full, skip: SKIP_FOLDERS.has(entry.replace(/\.txt$/, ''))});
      continue;
    }
    if (stat.isDirectory() && /^\d+$/.test(entry)) {
      if (SKIP_FOLDERS.has(entry)) {
        out.push({textFile: resolve(full, 'index.txt'), skip: true});
        continue;
      }
      const indexPath = resolve(full, 'index.txt');
      if (existsSync(indexPath)) {
        out.push({textFile: indexPath, skip: false});
      } else {
        console.log(`  · skip Blogs/${entry}/: no index.txt`);
      }
    }
  }
  return out;
}

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: Array<{name: string; value: string}>;
};

async function stageUpload(
  shop: string,
  token: string,
  filePath: string,
): Promise<StagedTarget> {
  const fileSize = statSync(filePath).size;
  const filename = basename(filePath);
  const mime = mimeType(filePath);
  const data = await adminGraphql<{
    stagedUploadsCreate: {
      stagedTargets: StagedTarget[];
      userErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    {
      input: [
        {
          filename,
          mimeType: mime,
          resource: 'FILE',
          fileSize: String(fileSize),
          httpMethod: 'POST',
        },
      ],
    },
  );
  const target = data.stagedUploadsCreate.stagedTargets[0];
  if (!target || data.stagedUploadsCreate.userErrors.length) {
    throw new Error(
      `stagedUploadsCreate failed: ${JSON.stringify(data.stagedUploadsCreate.userErrors)}`,
    );
  }
  return target;
}

async function postToStaged(target: StagedTarget, filePath: string): Promise<void> {
  const mime = mimeType(filePath);
  const form = new FormData();
  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }
  form.append(
    'file',
    new Blob([readFileSync(filePath)], {type: mime}),
    basename(filePath),
  );
  const res = await fetch(target.url, {method: 'POST', body: form});
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed: ${res.status} ${body.slice(0, 200)}`);
  }
}

async function createFileRecord(
  shop: string,
  token: string,
  resourceUrl: string,
  alt: string | undefined,
): Promise<{id: string; cdnUrl: string}> {
  const data = await adminGraphql<{
    fileCreate: {
      files: Array<{id: string} | null>;
      userErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id }
        userErrors { field message }
      }
    }`,
    {
      files: [
        {
          originalSource: resourceUrl,
          contentType: 'IMAGE',
          ...(alt ? {alt} : {}),
        },
      ],
    },
  );
  if (data.fileCreate.userErrors.length) {
    throw new Error(`fileCreate failed: ${JSON.stringify(data.fileCreate.userErrors)}`);
  }
  const file = data.fileCreate.files[0];
  if (!file?.id) throw new Error('fileCreate returned no file');

  let cdnUrl: string | null | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const lookup = await adminGraphql<{
      node: {
        id: string;
        image?: {url?: string | null} | null;
      } | null;
    }>(
      shop,
      token,
      `#graphql
      query($id: ID!) {
        node(id: $id) {
          ... on MediaImage { id image { url } }
        }
      }`,
      {id: file.id},
    );
    cdnUrl = lookup.node?.image?.url;
    if (cdnUrl) break;
    await sleep(1500);
  }
  if (!cdnUrl) throw new Error('Could not resolve CDN url for uploaded file');
  return {id: file.id, cdnUrl};
}

async function uploadLocalImage(
  shop: string,
  token: string,
  filePath: string,
  alt: string,
): Promise<{id: string; cdnUrl: string}> {
  console.log(`    ↑ uploading ${basename(filePath)} (${mimeType(filePath)})`);
  const target = await stageUpload(shop, token, filePath);
  await postToStaged(target, filePath);
  const file = await createFileRecord(shop, token, target.resourceUrl, alt);
  console.log(`    ✓ file id ${file.id} → ${file.cdnUrl}`);
  return file;
}

async function getJournalBlogId(
  shop: string,
  token: string,
): Promise<string> {
  const data = await adminGraphql<{
    blogs: {edges: Array<{node: {id: string; handle: string}}>};
  }>(shop, token, `query { blogs(first: 20) { edges { node { id handle } } } }`);
  const existing = data.blogs.edges.find((e) => e.node.handle === 'journal');
  if (!existing) {
    const created = await adminGraphql<{
      blogCreate: {blog: {id: string}; userErrors: Array<{message: string}>};
    }>(
      shop,
      token,
      `#graphql
      mutation CreateBlog($blog: BlogCreateInput!) {
        blogCreate(blog: $blog) { blog { id handle } userErrors { message } }
      }`,
      {blog: {title: 'Journal', handle: 'journal'}},
    );
    if (created.blogCreate.userErrors.length) {
      throw new Error(created.blogCreate.userErrors[0].message);
    }
    return created.blogCreate.blog.id;
  }
  return existing.node.id;
}

async function listJournalArticles(
  shop: string,
  token: string,
  blogId: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let cursor: string | null = null;
  do {
    const data = await adminGraphql<{
      blog: {
        articles: {
          pageInfo: {hasNextPage: boolean; endCursor: string | null};
          nodes: Array<{id: string; handle: string}>;
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
            nodes { id handle }
          }
        }
      }`,
      {blogId, first: 50, after: cursor},
    );
    const nodes = data.blog?.articles.nodes ?? [];
    for (const n of nodes) map.set(n.handle, n.id);
    const info = data.blog?.articles.pageInfo;
    cursor = info?.hasNextPage ? (info.endCursor ?? null) : null;
  } while (cursor);
  return map;
}

async function upsertArticle(
  shop: string,
  token: string,
  blogId: string,
  existingId: string | undefined,
  parsed: ParsedBlog,
  category: JournalCategory,
  imageUrl: string | undefined,
): Promise<{action: 'created' | 'updated'}> {
  const tags = [category];
  const imageInput = imageUrl
    ? {url: imageUrl, altText: parsed.altText || parsed.title}
    : undefined;

  if (existingId) {
    const articleInput: Record<string, unknown> = {
      title: parsed.title,
      body: parsed.bodyHtml,
      summary: parsed.excerpt,
      tags,
      isPublished: true,
      publishDate: PUBLISH_DATE,
    };
    if (imageInput) articleInput.image = imageInput;
    const result = await adminGraphql<{
      articleUpdate: {
        article: {handle: string};
        userErrors: Array<{message: string}>;
      };
    }>(
      shop,
      token,
      `#graphql
      mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!) {
        articleUpdate(id: $id, article: $article) {
          article { handle }
          userErrors { message }
        }
      }`,
      {id: existingId, article: articleInput},
    );
    if (result.articleUpdate.userErrors.length) {
      throw new Error(result.articleUpdate.userErrors[0].message);
    }
    return {action: 'updated'};
  }

  const articleInput: Record<string, unknown> = {
    blogId,
    title: parsed.title,
    handle: parsed.handle,
    author: {name: 'The Kashmir Weaver'},
    body: parsed.bodyHtml,
    summary: parsed.excerpt,
    tags,
    isPublished: true,
    publishDate: PUBLISH_DATE,
  };
  if (imageInput) articleInput.image = imageInput;
  const result = await adminGraphql<{
    articleCreate: {
      article: {handle: string};
      userErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation CreateArticle($article: ArticleCreateInput!) {
      articleCreate(article: $article) {
        article { handle }
        userErrors { message }
      }
    }`,
    {article: articleInput},
  );
  if (result.articleCreate.userErrors.length) {
    throw new Error(result.articleCreate.userErrors[0].message);
  }
  return {action: 'created'};
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  loadEnvFile();
  const shop = process.env.PUBLIC_STORE_DOMAIN ?? '';
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
  if (!shop || !token) {
    console.error('Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in .env');
    process.exit(1);
  }

  console.log(`\nUploading blogs from ${BLOGS_DIR} → ${shop}\n`);

  const discovered = discoverBlogs();
  const parsed: ParsedBlog[] = [];
  for (const entry of discovered) {
    if (entry.skip) {
      console.log(`  · skip ${basename(entry.textFile)} (in skip list)`);
      continue;
    }
    const p = parseBlogFile(entry.textFile);
    if (p) parsed.push(p);
  }

  console.log(`\nParsed ${parsed.length} blog article(s):\n`);
  for (const p of parsed) {
    const hasImage = p.imagePath ? '🖼  image' : '   text ';
    const cat = CATEGORY_MAP[p.handle] ?? '???';
    console.log(`  ${hasImage}  [${cat.padEnd(13)}] ${p.handle}`);
  }

  const blogId = await getJournalBlogId(shop, token);
  console.log(`\nJournal blog id: ${blogId}\n`);

  console.log('Listing existing articles…');
  const existing = await listJournalArticles(shop, token, blogId);
  console.log(`  found ${existing.size} existing\n`);

  const results: Array<{
    handle: string;
    category: JournalCategory;
    action: 'created' | 'updated' | 'failed';
    error?: string;
    imageUrl?: string;
  }> = [];

  for (const p of parsed) {
    const cat = CATEGORY_MAP[p.handle];
    if (!cat) {
      console.log(`  · ${p.handle}: no category mapping (skipped)`);
      results.push({handle: p.handle, category: 'Heritage', action: 'failed', error: 'no category'});
      continue;
    }
    let imageUrl: string | undefined;
    try {
      if (p.imagePath) {
        try {
          const file = await uploadLocalImage(
            shop,
            token,
            p.imagePath,
            p.altText || p.title,
          );
          imageUrl = file.cdnUrl;
        } catch (imgErr) {
          const msg = (imgErr as Error).message;
          const isScope =
            msg.includes('Access denied') && msg.includes('stagedUploadsCreate');
          if (isScope) {
            console.log(
              `    ! skipping image for ${p.handle}: Admin token lacks write_files scope`,
            );
            console.log(
              '      → add write_files to shopify.app.toml scopes, run `npm run auth:deploy-scopes`, then re-auth and re-run',
            );
          } else {
            throw imgErr;
          }
        }
      }
      const {action} = await upsertArticle(
        shop,
        token,
        blogId,
        existing.get(p.handle),
        p,
        cat,
        imageUrl,
      );
      console.log(`  ✓ ${action} ${p.handle} [${cat}]`);
      results.push({handle: p.handle, category: cat, action, imageUrl});
    } catch (err) {
      const msg = (err as Error).message;
      console.log(`  · ${p.handle}: ${msg}`);
      results.push({handle: p.handle, category: cat, action: 'failed', error: msg});
    }
    await sleep(400);
  }

  const created = results.filter((r) => r.action === 'created').length;
  const updated = results.filter((r) => r.action === 'updated').length;
  const failed = results.filter((r) => r.action === 'failed').length;
  console.log(`\nSummary: ${created} created · ${updated} updated · ${failed} failed\n`);

  writeFileSync(
    PROGRESS_FILE,
    JSON.stringify(
      {
        runAt: new Date().toISOString(),
        shop,
        publishDate: PUBLISH_DATE,
        summary: {created, updated, failed, total: parsed.length},
        results,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`Progress written to ${PROGRESS_FILE}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
