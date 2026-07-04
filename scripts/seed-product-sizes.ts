/**
 * Applies global Size options to all Shopify products (Admin API).
 *
 * Run: npm run seed:sizes
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DUMMY_TEST_HANDLE} from '../app/models/static/dummy-product.ts';
import {
  STORE_SIZE_OPTION_NAME,
  STORE_SIZE_VALUES,
  buildSizeOnlyVariants,
  shopifySizeProductOptions,
} from '../app/models/store-sizes.ts';

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
const API_VERSION = '2025-01';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

if (!SHOP || !TOKEN) {
  console.error('Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN');
  process.exit(1);
}

type AdminProduct = {
  id: string;
  handle: string;
  title: string;
  options: Array<{name: string; values: string[]}>;
  variants: {
    nodes: Array<{
      price: string;
      compareAtPrice: string | null;
    }>;
  };
};

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

async function listProducts(): Promise<AdminProduct[]> {
  const products: AdminProduct[] = [];
  let cursor: string | null = null;

  do {
    const data = await adminGraphql<{
      products: {
        nodes: AdminProduct[];
        pageInfo: {hasNextPage: boolean; endCursor: string | null};
      };
    }>(
      `#graphql
      query ListProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            handle
            title
            options { name values }
            variants(first: 1) {
              nodes { price compareAtPrice }
            }
          }
        }
      }`,
      {cursor},
    );

    products.push(...data.products.nodes);
    cursor = data.products.pageInfo.hasNextPage
      ? data.products.pageInfo.endCursor
      : null;
  } while (cursor);

  return products;
}

function hasGlobalSizes(product: AdminProduct): boolean {
  const sizeOption = product.options.find((o) => o.name === STORE_SIZE_OPTION_NAME);
  if (!sizeOption) return false;
  return STORE_SIZE_VALUES.every((value) => sizeOption.values.includes(value));
}

function hasNonSizeOptions(product: AdminProduct): boolean {
  return product.options.some(
    (o) => o.name !== STORE_SIZE_OPTION_NAME && o.name !== 'Title',
  );
}

async function syncProductSizes(product: AdminProduct) {
  const primary = product.variants.nodes[0];
  if (!primary) {
    throw new Error('no variants');
  }

  const price = parseFloat(primary.price);
  const compareAtPrice = primary.compareAtPrice
    ? parseFloat(primary.compareAtPrice)
    : undefined;

  const result = await adminGraphql<{
    productSet: {
      product: {handle: string};
      userErrors: Array<{field: string[]; message: string}>;
    };
  }>(
    `#graphql
    mutation SyncProductSizes($input: ProductSetInput!) {
      productSet(synchronous: true, input: $input) {
        product { handle }
        userErrors { field message }
      }
    }`,
    {
      input: {
        id: product.id,
        productOptions: shopifySizeProductOptions(),
        variants: buildSizeOnlyVariants(price, compareAtPrice),
      },
    },
  );

  if (result.productSet.userErrors.length) {
    throw new Error(result.productSet.userErrors[0].message);
  }
}

async function main() {
  console.log(`\nApplying global sizes on ${SHOP}…\n`);

  const products = await listProducts();
  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    if (product.handle === DUMMY_TEST_HANDLE) {
      console.log(`  · skip ${product.handle} (use npm run seed:dummy-product)`);
      skipped++;
      continue;
    }

    if (hasNonSizeOptions(product)) {
      console.log(`  · skip ${product.handle} (has options beyond Size)`);
      skipped++;
      continue;
    }

    if (hasGlobalSizes(product)) {
      console.log(`  · skip ${product.handle} (sizes already set)`);
      skipped++;
      continue;
    }

    try {
      await syncProductSizes(product);
      console.log(`  ✓ ${product.handle}`);
      updated++;
      await sleep(400);
    } catch (err) {
      console.log(`  ✗ ${product.handle}: ${(err as Error).message}`);
    }
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped}.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
