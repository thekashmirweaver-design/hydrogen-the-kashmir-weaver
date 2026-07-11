/**
 * Convert specific heavy Shopify PNG media (from Lighthouse) to JPEG via
 * macOS `sips`, then swap product media / upload Files copies.
 *
 * Usage:
 *   npx tsx scripts/convert-heavy-pngs-to-jpg.ts [--dry-run]
 *
 * Requires SHOPIFY_ADMIN_ACCESS_TOKEN + PUBLIC_STORE_DOMAIN in `.env`.
 */
import {execFileSync} from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {basename, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const API_VERSION = '2025-01';
const TMP_DIR = resolve('/tmp/tkw-png-convert');

/** Exact basenames from mobile Lighthouse image-delivery (PNG only). */
const TARGET_BASENAMES = [
  'pomelli_photoshoot_image_4_5_0711_1_2_91584395-809e-4bfb-a5dd-17783bc3a459.png',
  'set0-shade-242.png',
  'set0-shade-242-D.png',
];

function loadEnvFile() {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
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
    throw new Error(JSON.stringify(json.errors));
  }
  if (!json.data) throw new Error('Admin GraphQL returned no data');
  return json.data;
}

function urlBasename(url: string): string {
  try {
    return basename(new URL(url).pathname);
  } catch {
    return basename(url.split('?')[0] ?? url);
  }
}

async function findFileByBasename(shop: string, token: string, name: string) {
  // filename: query is exact-ish for Files search
  const stem = name.replace(/\.[^.]+$/, '');
  const data = await adminGraphql<{
    files: {
      nodes: Array<{
        id: string;
        alt: string | null;
        image: {url: string; width: number; height: number} | null;
      }>;
    };
  }>(
    shop,
    token,
    `#graphql
    query($q: String!) {
      files(first: 25, query: $q) {
        nodes {
          ... on MediaImage {
            id
            alt
            image { url width height }
          }
        }
      }
    }`,
    {q: `filename:${stem}`},
  );

  const exact = data.files.nodes.find(
    (n) => n.image?.url && urlBasename(n.image.url) === name,
  );
  if (exact) return exact;

  return data.files.nodes.find(
    (n) => n.image?.url && urlBasename(n.image.url).includes(stem),
  );
}

function convertPngToJpg(pngPath: string, jpgPath: string) {
  execFileSync(
    'sips',
    [
      '-s',
      'format',
      'jpeg',
      '-s',
      'formatOptions',
      '82',
      pngPath,
      '--out',
      jpgPath,
    ],
    {stdio: 'pipe'},
  );
}

async function stageAndUpload(
  shop: string,
  token: string,
  filePath: string,
  resource: 'PRODUCT_IMAGE' | 'FILE',
): Promise<string> {
  const fileSize = statSync(filePath).size;
  const filename = basename(filePath);
  const mime = 'image/jpeg';

  const staged = await adminGraphql<{
    stagedUploadsCreate: {
      stagedTargets: Array<{
        url: string;
        resourceUrl: string;
        parameters: Array<{name: string; value: string}>;
      }>;
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
          resource,
          fileSize: String(fileSize),
          httpMethod: 'POST',
        },
      ],
    },
  );

  const target = staged.stagedUploadsCreate.stagedTargets[0];
  if (!target || staged.stagedUploadsCreate.userErrors.length) {
    throw new Error(
      `stagedUploadsCreate failed: ${JSON.stringify(staged.stagedUploadsCreate.userErrors)}`,
    );
  }

  const form = new FormData();
  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }
  form.append('file', new Blob([readFileSync(filePath)], {type: mime}), filename);

  const uploadRes = await fetch(target.url, {method: 'POST', body: form});
  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(
      `Upload failed: ${uploadRes.status} ${body.slice(0, 200)}`,
    );
  }

  return target.resourceUrl;
}

async function replaceProductMedia(
  shop: string,
  token: string,
  productId: string,
  oldMediaId: string,
  resourceUrl: string,
  alt: string | null,
) {
  const create = await adminGraphql<{
    productCreateMedia: {
      media: Array<{id: string} | null>;
      mediaUserErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media { ... on MediaImage { id } }
        mediaUserErrors { field message }
      }
    }`,
    {
      productId,
      media: [
        {
          originalSource: resourceUrl,
          mediaContentType: 'IMAGE',
          alt: alt ?? undefined,
        },
      ],
    },
  );

  if (create.productCreateMedia.mediaUserErrors.length) {
    throw new Error(
      `productCreateMedia failed: ${JSON.stringify(create.productCreateMedia.mediaUserErrors)}`,
    );
  }

  const newId = create.productCreateMedia.media[0]?.id;
  if (!newId) throw new Error('productCreateMedia returned no media id');

  const product = await adminGraphql<{
    product: {media: {nodes: Array<{id: string}>}};
  }>(
    shop,
    token,
    `#graphql
    query($id: ID!) {
      product(id: $id) {
        media(first: 100) {
          nodes { ... on MediaImage { id } }
        }
      }
    }`,
    {id: productId},
  );

  const ids = product.product.media.nodes.map((n) => n.id);
  const oldIndex = ids.indexOf(oldMediaId);
  const withoutOld = ids.filter((id) => id !== oldMediaId && id !== newId);
  const ordered =
    oldIndex >= 0
      ? [
          ...withoutOld.slice(0, oldIndex),
          newId,
          ...withoutOld.slice(oldIndex),
        ]
      : [...withoutOld, newId];

  const moves = ordered.map((id, index) => ({
    id,
    newPosition: String(index),
  }));

  const reorder = await adminGraphql<{
    productReorderMedia: {userErrors: Array<{message: string}>};
  }>(
    shop,
    token,
    `#graphql
    mutation($id: ID!, $moves: [MoveInput!]!) {
      productReorderMedia(id: $id, moves: $moves) {
        userErrors { message }
      }
    }`,
    {id: productId, moves},
  );

  if (reorder.productReorderMedia.userErrors.length) {
    throw new Error(
      `productReorderMedia failed: ${JSON.stringify(reorder.productReorderMedia.userErrors)}`,
    );
  }

  const del = await adminGraphql<{
    productDeleteMedia: {
      deletedMediaIds: string[];
      mediaUserErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($productId: ID!, $mediaIds: [ID!]!) {
      productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
        deletedMediaIds
        mediaUserErrors { message }
      }
    }`,
    {productId, mediaIds: [oldMediaId]},
  );

  if (del.productDeleteMedia.mediaUserErrors.length) {
    throw new Error(
      `productDeleteMedia failed: ${JSON.stringify(del.productDeleteMedia.mediaUserErrors)}`,
    );
  }

  return newId;
}

async function uploadAsFile(
  shop: string,
  token: string,
  filePath: string,
  alt: string | null,
) {
  const resourceUrl = await stageAndUpload(shop, token, filePath, 'FILE');
  const filename = basename(filePath);

  const created = await adminGraphql<{
    fileCreate: {
      files: Array<{
        id: string;
        alt?: string | null;
        preview?: {image?: {url?: string} | null} | null;
      } | null>;
      userErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          ... on MediaImage {
            id
            alt
            preview { image { url } }
          }
        }
        userErrors { message }
      }
    }`,
    {
      files: [
        {
          originalSource: resourceUrl,
          contentType: 'IMAGE',
          alt: alt ?? undefined,
          filename,
        },
      ],
    },
  );

  if (created.fileCreate.userErrors.length) {
    throw new Error(
      `fileCreate failed: ${JSON.stringify(created.fileCreate.userErrors)}`,
    );
  }

  return created.fileCreate.files[0];
}

async function downloadAndConvert(url: string, name: string) {
  const pngPath = resolve(TMP_DIR, name);
  const jpgName = name.replace(/\.png$/i, '.jpg');
  const jpgPath = resolve(TMP_DIR, jpgName);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status} ${url}`);
  writeFileSync(pngPath, Buffer.from(await res.arrayBuffer()));
  convertPngToJpg(pngPath, jpgPath);
  const before = statSync(pngPath).size;
  const after = statSync(jpgPath).size;
  console.log(
    `  converted ${before} → ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`,
  );
  return jpgPath;
}

async function main() {
  loadEnvFile();
  const dryRun = process.argv.includes('--dry-run');
  const shop = process.env.PUBLIC_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!shop || !token) {
    throw new Error('Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN');
  }

  mkdirSync(TMP_DIR, {recursive: true});
  console.log(`Targets: ${TARGET_BASENAMES.join(', ')}`);

  // Scan products once
  console.log('Indexing product media…');
  const productIndex = new Map<
    string,
    Array<{
      productId: string;
      handle: string;
      mediaId: string;
      alt: string | null;
      url: string;
    }>
  >();

  for (const name of TARGET_BASENAMES) {
    productIndex.set(name, []);
  }

  let cursor: string | null = null;
  let pages = 0;
  do {
    const data = await adminGraphql<{
      products: {
        pageInfo: {hasNextPage: boolean; endCursor: string | null};
        nodes: Array<{
          id: string;
          handle: string;
          media: {
            nodes: Array<{
              id: string;
              alt: string | null;
              image: {url: string} | null;
            }>;
          };
        }>;
      };
    }>(
      shop,
      token,
      `#graphql
      query($cursor: String) {
        products(first: 50, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            handle
            media(first: 40) {
              nodes {
                ... on MediaImage {
                  id
                  alt
                  image { url }
                }
              }
            }
          }
        }
      }`,
      {cursor},
    );

    for (const product of data.products.nodes) {
      for (const media of product.media.nodes) {
        const url = media.image?.url ?? '';
        const base = urlBasename(url);
        const list = productIndex.get(base);
        if (!list) continue;
        list.push({
          productId: product.id,
          handle: product.handle,
          mediaId: media.id,
          alt: media.alt,
          url,
        });
      }
    }

    pages += 1;
    cursor = data.products.pageInfo.hasNextPage
      ? data.products.pageInfo.endCursor
      : null;
  } while (cursor && pages < 40);

  for (const name of TARGET_BASENAMES) {
    console.log(`\n→ ${name}`);
    const uses = productIndex.get(name) ?? [];
    console.log(
      `  product media refs: ${uses.length}${
        uses.length ? ` (${[...new Set(uses.map((u) => u.handle))].join(', ')})` : ''
      }`,
    );

    let sourceUrl = uses[0]?.url;
    let alt: string | null = uses[0]?.alt ?? null;

    if (!sourceUrl) {
      const file = await findFileByBasename(shop, token, name);
      if (!file?.image?.url) {
        console.log('  not found in Files or product media — skip');
        continue;
      }
      sourceUrl = file.image.url;
      alt = file.alt;
      console.log(`  found in Files: ${sourceUrl}`);
    }

    if (dryRun) continue;

    const jpgPath = await downloadAndConvert(sourceUrl, name);

    if (uses.length) {
      for (const use of uses) {
        const resourceUrl = await stageAndUpload(
          shop,
          token,
          jpgPath,
          'PRODUCT_IMAGE',
        );
        const newId = await replaceProductMedia(
          shop,
          token,
          use.productId,
          use.mediaId,
          resourceUrl,
          use.alt,
        );
        console.log(
          `  swapped media on ${use.handle}: ${use.mediaId} → ${newId}`,
        );
      }
    } else {
      const created = await uploadAsFile(shop, token, jpgPath, alt);
      console.log(
        `  uploaded FILE jpg: ${created?.id} ${created?.preview?.image?.url ?? ''}`,
      );
      console.log(
        '  note: wire new URL into theme/metafields if anything still points at the PNG',
      );
    }
  }

  console.log(dryRun ? '\nDry run complete.' : '\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
