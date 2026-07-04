/** Storefront collection snapshot — same path as CollectionView loader */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mapCollection, mapProduct} from '../app/models/shopify/mappers.ts';
import {COLLECTION_BY_HANDLE_QUERY} from '../app/models/shopify/queries.ts';

function loadEnvFile() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
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

const handle = process.argv[2] ?? 'solids';
const domain = process.env.PUBLIC_STORE_DOMAIN ?? '';
const token = process.env.PUBLIC_STOREFRONT_API_TOKEN ?? '';

async function main() {
  const res = await fetch(`https://${domain}/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({
      query: COLLECTION_BY_HANDLE_QUERY,
      variables: {handle, productFirst: 20},
    }),
  });

  const json = (await res.json()) as {
    data?: {collection: unknown};
    errors?: Array<{message: string}>;
  };

  if (json.errors?.length) {
    console.warn('Partial errors:', json.errors.map((e) => e.message).join('; '));
  }

  const raw = json.data?.collection as Parameters<typeof mapCollection>[0] & {
    products: {edges: Array<{node: Parameters<typeof mapProduct>[0]}>};
  };

  if (!raw) {
    console.log(`No collection: ${handle}`);
    return;
  }

  const collection = mapCollection(raw);
  const products = raw.products.edges.map(({node}) => mapProduct(node));

  console.log(`\n=== Storefront raw collection: ${handle} ===\n`);
  console.log(JSON.stringify(raw, null, 2));

  console.log(`\n=== Mapped Collection (CollectionView) ===\n`);
  console.log(JSON.stringify(collection, null, 2));

  console.log(`\n=== Products in collection (${products.length}) — tile fields ===\n`);
  console.log(
    JSON.stringify(
      products.map((p) => ({
        handle: p.handle,
        name: p.name,
        collectionName: p.collectionName,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        stock: p.stock,
        imageCount: p.images.length,
        variantCount: p.variants?.length,
        tags: p.tags,
      })),
      null,
      2,
    ),
  );
}

main();
