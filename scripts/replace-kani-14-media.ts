/**
 * Replace ALL media on folder 14 Kani draft with images from local folder.
 * Does not change title/price/status/other fields.
 *
 * Usage: npx tsx scripts/replace-kani-14-media.ts
 */
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {basename, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const API_VERSION = '2025-10';
const PRODUCT_ID = 'gid://shopify/Product/9326383268055';
const PRODUCT_HANDLE =
  'olive-cream-stripe-turquoise-geometric-kani-cashmere-pashmina-shawl';
const DIR =
  '/Users/iambqc/Downloads/THE KASHMIR WEAVER/PRODUCTS/GENERATED/MUDASIR/KANI/14';
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

/** Sensible order: unnumbered first, then (1), (2), … */
function listLocalImages(dir: string): string[] {
  const files = readdirSync(dir).filter((f) =>
    IMAGE_EXTS.has(extname(f).toLowerCase()),
  );
  files.sort((a, b) => {
    const na = a.match(/\((\d+)\)/)?.[1];
    const nb = b.match(/\((\d+)\)/)?.[1];
    if (!na && !nb) return a.localeCompare(b);
    if (!na) return -1;
    if (!nb) return 1;
    return Number(na) - Number(nb);
  });
  return files.map((f) => join(dir, f));
}

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
  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{message: string}>;
  };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  if (!json.data) throw new Error('GraphQL response missing data');
  return json.data;
}

async function fetchMedia(
  shop: string,
  token: string,
): Promise<{id: string; alt: string | null; status: string}[]> {
  const data = await adminGraphql<{
    product: {
      id: string;
      handle: string;
      status: string;
      media: {
        nodes: Array<{
          id: string;
          alt: string | null;
          status: string;
        }>;
      };
    } | null;
  }>(
    shop,
    token,
    `#graphql
    query($id: ID!) {
      product(id: $id) {
        id handle status
        media(first: 50) {
          nodes { id alt status }
        }
      }
    }`,
    {id: PRODUCT_ID},
  );
  if (!data.product) throw new Error('Product not found');
  if (data.product.handle !== PRODUCT_HANDLE) {
    throw new Error(
      `Handle mismatch: expected ${PRODUCT_HANDLE} got ${data.product.handle}`,
    );
  }
  if (data.product.status !== 'DRAFT') {
    throw new Error(`Refusing non-DRAFT status=${data.product.status}`);
  }
  return data.product.media.nodes;
}

async function stageAndUpload(
  shop: string,
  token: string,
  filePath: string,
): Promise<string> {
  const fileSize = statSync(filePath).size;
  const filename = basename(filePath);
  const mime = mimeType(filePath);

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
          resource: 'PRODUCT_IMAGE',
          fileSize: String(fileSize),
          httpMethod: 'POST',
        },
      ],
    },
  );

  const target = staged.stagedUploadsCreate.stagedTargets[0];
  if (!target || staged.stagedUploadsCreate.userErrors.length) {
    throw new Error(
      `stagedUploadsCreate failed for ${filename}: ${JSON.stringify(staged.stagedUploadsCreate.userErrors)}`,
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
      `Upload failed for ${filename}: ${uploadRes.status} ${body.slice(0, 200)}`,
    );
  }

  return target.resourceUrl;
}

async function main() {
  loadEnvFile();
  const shop = process.env.PUBLIC_STORE_DOMAIN ?? '';
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
  if (!shop || !token) {
    console.error('Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN');
    process.exit(1);
  }

  const localImages = listLocalImages(DIR);
  console.log(`\nStore: ${shop}`);
  console.log(`Product: ${PRODUCT_ID}`);
  console.log(`Handle: ${PRODUCT_HANDLE}`);
  console.log(`Local images (${localImages.length}):`);
  for (const p of localImages) console.log(`  - ${basename(p)}`);

  const before = await fetchMedia(shop, token);
  console.log(`\nMedia BEFORE: ${before.length}`);
  for (const m of before) console.log(`  - ${m.id} status=${m.status}`);

  if (before.length > 0) {
    process.stdout.write(`Deleting ${before.length} media… `);
    const del = await adminGraphql<{
      productDeleteMedia: {
        deletedMediaIds: string[] | null;
        deletedProductImageIds: string[] | null;
        mediaUserErrors: Array<{message: string}>;
      };
    }>(
      shop,
      token,
      `#graphql
      mutation($productId: ID!, $mediaIds: [ID!]!) {
        productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
          deletedMediaIds
          deletedProductImageIds
          mediaUserErrors { field message }
        }
      }`,
      {productId: PRODUCT_ID, mediaIds: before.map((m) => m.id)},
    );
    if (del.productDeleteMedia.mediaUserErrors.length) {
      throw new Error(
        del.productDeleteMedia.mediaUserErrors.map((e) => e.message).join('; '),
      );
    }
    console.log(
      `ok deleted=${del.productDeleteMedia.deletedMediaIds?.length ?? 0}`,
    );
    await sleep(500);
  } else {
    console.log('No existing media to delete.');
  }

  const afterDelete = await fetchMedia(shop, token);
  console.log(`Media AFTER DELETE: ${afterDelete.length}`);
  if (afterDelete.length > 0) {
    throw new Error('Old media still present after delete');
  }

  const resourceUrls: string[] = [];
  for (const [i, filePath] of localImages.entries()) {
    process.stdout.write(
      `Staging ${i + 1}/${localImages.length} ${basename(filePath)}… `,
    );
    const url = await stageAndUpload(shop, token, filePath);
    resourceUrls.push(url);
    console.log('ok');
    await sleep(250);
  }

  process.stdout.write('Attaching media… ');
  const create = await adminGraphql<{
    productCreateMedia: {
      media: Array<{id: string; status: string}> | null;
      mediaUserErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media { id status }
        mediaUserErrors { field message }
      }
    }`,
    {
      productId: PRODUCT_ID,
      media: resourceUrls.map((originalSource, i) => ({
        originalSource,
        mediaContentType: 'IMAGE',
        alt: `Olive Cream Stripe Turquoise Geometric Kani Cashmere Pashmina Shawl — image ${i + 1}`,
      })),
    },
  );
  if (create.productCreateMedia.mediaUserErrors.length) {
    throw new Error(
      create.productCreateMedia.mediaUserErrors.map((e) => e.message).join('; '),
    );
  }
  console.log(`ok created=${create.productCreateMedia.media?.length ?? 0}`);

  // Wait briefly for processing
  await sleep(1500);
  const after = await fetchMedia(shop, token);
  console.log(`\nMedia AFTER: ${after.length}`);
  for (const m of after) console.log(`  - ${m.id} status=${m.status}`);

  console.log('\n========== SUMMARY ==========');
  console.log(
    JSON.stringify(
      {
        productId: PRODUCT_ID,
        handle: PRODUCT_HANDLE,
        mediaBefore: before.length,
        mediaAfterDelete: afterDelete.length,
        localImages: localImages.map((p) => basename(p)),
        mediaAfter: after.length,
        oldMediaRemoved: afterDelete.length === 0,
        status: 'DRAFT (unchanged)',
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
