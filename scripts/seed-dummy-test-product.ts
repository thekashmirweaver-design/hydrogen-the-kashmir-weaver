/**
 * Seeds the test-all-fields dummy product into Shopify under the solids collection.
 *
 * Requires: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN, PUBLIC_STORE_URL
 * Run: npm run seed:dummy-product
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  DUMMY_TEST_HANDLE,
  DUMMY_TEST_PRODUCT,
} from '../app/models/static/dummy-product.ts';
import type {Product} from '../app/models/types.ts';

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
const COLLECTION_HANDLE = 'solids';
const HEADLESS_CHANNEL_NAME = 'The Kashmir Weaver';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

if (!SHOP || !TOKEN || !BASE_URL) {
  console.error(
    'Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN, PUBLIC_STORE_URL',
  );
  process.exit(1);
}

function assetUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
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

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{message: string}>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  return json.data as T;
}

function productMetafields(product: Product) {
  return [
    {
      namespace: 'custom',
      key: 'story',
      type: 'multi_line_text_field',
      value: product.story,
    },
    {
      namespace: 'custom',
      key: 'short_description',
      type: 'single_line_text_field',
      value: product.shortDescription,
    },
    {
      namespace: 'custom',
      key: 'material',
      type: 'single_line_text_field',
      value: product.material,
    },
    {
      namespace: 'custom',
      key: 'origin',
      type: 'single_line_text_field',
      value: product.origin,
    },
    {
      namespace: 'custom',
      key: 'weave',
      type: 'single_line_text_field',
      value: product.weave,
    },
    {
      namespace: 'custom',
      key: 'limited',
      type: 'boolean',
      value: String(!!product.limited),
    },
    {
      namespace: 'custom',
      key: 'stock_qty',
      type: 'number_integer',
      value: String(product.stockQty ?? 1),
    },
  ];
}

async function findProductByHandle(handle: string) {
  const data = await adminGraphql<{
    productByHandle: {id: string; handle: string} | null;
  }>(
    `#graphql
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) { id handle }
    }`,
    {handle},
  );
  return data.productByHandle;
}

async function findCollectionByHandle(handle: string) {
  const data = await adminGraphql<{
    collectionByHandle: {id: string; handle: string} | null;
  }>(
    `#graphql
    query CollectionByHandle($handle: String!) {
      collectionByHandle(handle: $handle) { id handle }
    }`,
    {handle},
  );
  return data.collectionByHandle;
}

async function createProduct(product: Product): Promise<string> {
  const media = product.images.map((img) => ({
    originalSource: assetUrl(img.src),
    mediaContentType: 'IMAGE',
    alt: img.alt,
  }));

  const productOptions =
    product.options?.map((option) => ({
      name: option.name,
      values: option.values.map((name) => ({name})),
    })) ?? [];

  const result = await adminGraphql<{
    productCreate: {
      product: {id: string; handle: string};
      userErrors: Array<{message: string}>;
    };
  }>(
    `#graphql
    mutation CreateDummyProduct($input: ProductInput!, $media: [CreateMediaInput!]) {
      productCreate(input: $input, media: $media) {
        product { id handle }
        userErrors { message }
      }
    }`,
    {
      input: {
        title: product.name,
        handle: product.handle,
        descriptionHtml: `<p>${product.description}</p>`,
        productType: product.productType ?? 'Pashmina Shawl',
        vendor: product.vendor ?? 'The Kashmir Weaver',
        tags: product.tags,
        productOptions,
        metafields: productMetafields(product),
      },
      media,
    },
  );

  if (result.productCreate.userErrors.length) {
    throw new Error(result.productCreate.userErrors[0].message);
  }

  return result.productCreate.product.id;
}

async function syncFullProduct(productId: string, product: Product) {
  const productOptions =
    product.options?.map((option) => ({
      name: option.name,
      values: option.values.map((name) => ({name})),
    })) ?? [];

  const variants =
    product.variants?.map((variant) => ({
      optionValues: variant.selectedOptions.map((o) => ({
        optionName: o.name,
        name: o.value,
      })),
      price: String(variant.price.amount),
      compareAtPrice: variant.compareAtPrice
        ? String(variant.compareAtPrice.amount)
        : undefined,
    })) ?? [];

  const result = await adminGraphql<{
    productSet: {
      product: {id: string; handle: string};
      userErrors: Array<{field: string[]; message: string}>;
    };
  }>(
    `#graphql
    mutation SyncDummyProduct($input: ProductSetInput!) {
      productSet(synchronous: true, input: $input) {
        product { id handle }
        userErrors { field message }
      }
    }`,
    {
      input: {
        id: productId,
        productOptions,
        variants,
      },
    },
  );

  if (result.productSet.userErrors.length) {
    throw new Error(result.productSet.userErrors[0].message);
  }
}

async function addToCollection(collectionId: string, productId: string) {
  const result = await adminGraphql<{
    collectionAddProducts: {userErrors: Array<{message: string}>};
  }>(
    `#graphql
    mutation AddToCollection($id: ID!, $productIds: [ID!]!) {
      collectionAddProducts(id: $id, productIds: $productIds) {
        userErrors { message }
      }
    }`,
    {id: collectionId, productIds: [productId]},
  );

  if (result.collectionAddProducts.userErrors.length) {
    throw new Error(result.collectionAddProducts.userErrors[0].message);
  }
}

async function publishProduct(productId: string) {
  await adminRestPublish(productId);

  try {
    const data = await adminGraphql<{
      catalogs: {nodes: Array<{id: string; title: string}>};
    }>(`#graphql
      query HeadlessCatalogs {
        catalogs(first: 20) { nodes { id title } }
      }
    `);

    const catalog = data.catalogs.nodes.find((c) =>
      c.title.includes(HEADLESS_CHANNEL_NAME),
    );
    if (!catalog) return;

    const publicationId = `gid://shopify/Publication/${catalog.id.split('/').pop()}`;
    await adminGraphql(
      `#graphql
      mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
        publishablePublish(id: $id, input: $input) {
          userErrors { message }
        }
      }`,
      {id: productId, input: [{publicationId}]},
    );
  } catch (err) {
    console.log(`  · Headless publish: ${(err as Error).message}`);
  }
}

async function adminRestPublish(productId: string) {
  const numericId = productId.split('/').pop();
  if (!numericId) return;

  const res = await fetch(
    `https://${SHOP}/admin/api/${API_VERSION}/products/${numericId}.json`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': TOKEN,
      },
      body: JSON.stringify({product: {id: Number(numericId), published: true}}),
    },
  );

  if (!res.ok) {
    throw new Error(`REST publish ${res.status}: ${await res.text()}`);
  }
}

async function main() {
  console.log(`\nSeeding dummy product to ${SHOP}`);
  console.log(`Handle: ${DUMMY_TEST_HANDLE}`);
  console.log(`Collection: ${COLLECTION_HANDLE}`);
  console.log(`Assets: ${BASE_URL}\n`);

  const collection = await findCollectionByHandle(COLLECTION_HANDLE);
  if (!collection) {
    throw new Error(
      `Collection "${COLLECTION_HANDLE}" not found. Run npm run seed:collections first.`,
    );
  }
  console.log(`  ✓ found collection ${collection.handle}`);

  let productId: string;
  const existing = await findProductByHandle(DUMMY_TEST_HANDLE);

  if (existing) {
    productId = existing.id;
    console.log(`  · product already exists (${existing.handle})`);
  } else {
    productId = await createProduct(DUMMY_TEST_PRODUCT);
    console.log(`  ✓ created product ${DUMMY_TEST_HANDLE}`);
    await sleep(1500);
  }

  await syncFullProduct(productId, DUMMY_TEST_PRODUCT);
  console.log(`  ✓ synced ${DUMMY_TEST_PRODUCT.variants?.length ?? 0} variants`);

  await addToCollection(collection.id, productId);
  console.log(`  ✓ added to collection ${COLLECTION_HANDLE}`);

  await publishProduct(productId);
  console.log(`  ✓ published to Online Store (+ headless if available)`);

  console.log(`\nDone. View in admin or at /products/${DUMMY_TEST_HANDLE}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
