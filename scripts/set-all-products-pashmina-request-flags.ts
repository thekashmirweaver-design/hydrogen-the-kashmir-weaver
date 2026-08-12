/**
 * One-off: set on ALL store products:
 *   - Shopify Product type (storefront “department”) = "pashmina"
 *   - custom.request_more_images = true
 *   - custom.request_price = false
 *
 * Run: npx tsx scripts/set-all-products-pashmina-request-flags.ts
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

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
  process.env.PUBLIC_STORE_DOMAIN ?? process.env.SHOPIFY_STORE_DOMAIN ?? '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
const API_VERSION = '2025-01';
const TARGET_PRODUCT_TYPE = 'pashmina';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

if (!SHOP || !TOKEN) {
  console.error('Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN');
  process.exit(1);
}

type ProductNode = {
  id: string;
  handle: string;
  productType: string | null;
  requestMoreImages: {value: string} | null;
  requestPrice: {value: string} | null;
};

async function adminGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  attempt = 0,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': TOKEN,
      },
      body: JSON.stringify({query, variables}),
    });
  } catch (err) {
    if (attempt < 3) {
      await sleep(2000 * (attempt + 1));
      return adminGraphql(query, variables, attempt + 1);
    }
    throw err;
  }

  const text = await res.text();
  let json: {
    data?: T;
    errors?: Array<{message: string}>;
    extensions?: {cost?: {throttleStatus?: {currentlyAvailable?: number}}};
  };
  try {
    json = JSON.parse(text);
  } catch {
    if (attempt < 3) {
      await sleep(2000 * (attempt + 1));
      return adminGraphql(query, variables, attempt + 1);
    }
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join('; ');
    if (/throttl|rate|access token/i.test(msg) && attempt < 6) {
      const wait = 3000 * (attempt + 1);
      console.log(`  ⚠ retry (${attempt + 1}): ${msg.slice(0, 80)}`);
      await sleep(wait);
      return adminGraphql(query, variables, attempt + 1);
    }
    throw new Error(msg);
  }

  const available =
    json.extensions?.cost?.throttleStatus?.currentlyAvailable ?? 1000;
  if (available < 200) await sleep(500);

  return json.data as T;
}

async function listAllProducts(): Promise<ProductNode[]> {
  const products: ProductNode[] = [];
  let cursor: string | null = null;
  let page = 0;

  do {
    const data = await adminGraphql<{
      products: {
        pageInfo: {hasNextPage: boolean; endCursor: string | null};
        nodes: ProductNode[];
      };
    }>(
      `#graphql
      query ListProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            handle
            productType
            requestMoreImages: metafield(namespace: "custom", key: "request_more_images") { value }
            requestPrice: metafield(namespace: "custom", key: "request_price") { value }
          }
        }
      }`,
      {cursor},
    );

    products.push(...data.products.nodes);
    page += 1;
    console.log(`  listed page ${page}: ${products.length} products`);
    cursor = data.products.pageInfo.hasNextPage
      ? data.products.pageInfo.endCursor
      : null;
    await sleep(200);
  } while (cursor);

  return products;
}

function needsUpdate(p: ProductNode): boolean {
  return (
    (p.productType ?? '') !== TARGET_PRODUCT_TYPE ||
    p.requestMoreImages?.value !== 'true' ||
    p.requestPrice?.value !== 'false'
  );
}

async function updateProduct(id: string) {
  const data = await adminGraphql<{
    productUpdate: {
      product: {
        id: string;
        handle: string;
        productType: string;
        requestMoreImages: {value: string} | null;
        requestPrice: {value: string} | null;
      } | null;
      userErrors: Array<{field: string[] | null; message: string}>;
    };
  }>(
    `#graphql
    mutation UpdateProductFlags($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          handle
          productType
          requestMoreImages: metafield(namespace: "custom", key: "request_more_images") { value }
          requestPrice: metafield(namespace: "custom", key: "request_price") { value }
        }
        userErrors { field message }
      }
    }`,
    {
      input: {
        id,
        productType: TARGET_PRODUCT_TYPE,
        metafields: [
          {
            namespace: 'custom',
            key: 'request_more_images',
            type: 'boolean',
            value: 'true',
          },
          {
            namespace: 'custom',
            key: 'request_price',
            type: 'boolean',
            value: 'false',
          },
        ],
      },
    },
  );

  if (data.productUpdate.userErrors.length) {
    throw new Error(
      data.productUpdate.userErrors.map((e) => e.message).join('; '),
    );
  }
  return data.productUpdate.product;
}

async function main() {
  console.log(`Shop: ${SHOP}`);
  console.log('Listing all products…');
  const products = await listAllProducts();
  console.log(`Total products: ${products.length}`);

  const toUpdate = products.filter(needsUpdate);
  const alreadyOk = products.length - toUpdate.length;
  console.log(`Already correct: ${alreadyOk}`);
  console.log(`To update: ${toUpdate.length}`);

  let updated = 0;
  let failed = 0;
  const failures: Array<{handle: string; id: string; error: string}> = [];

  for (let i = 0; i < toUpdate.length; i++) {
    const p = toUpdate[i];
    try {
      await updateProduct(p.id);
      updated += 1;
      if ((i + 1) % 25 === 0 || i === toUpdate.length - 1) {
        console.log(`  progress ${i + 1}/${toUpdate.length} (ok=${updated}, fail=${failed})`);
      }
    } catch (err) {
      failed += 1;
      failures.push({
        handle: p.handle,
        id: p.id,
        error: (err as Error).message,
      });
      console.log(`  ✗ ${p.handle}: ${(err as Error).message}`);
    }
    await sleep(250);
  }

  console.log('\n--- Verification sample ---');
  const verifyIds = [
    ...toUpdate.slice(0, 5).map((p) => p.id),
    ...products.slice(-3).map((p) => p.id),
  ].filter((id, idx, arr) => arr.indexOf(id) === idx);

  let verifyOk = 0;
  let verifyBad = 0;
  for (const id of verifyIds) {
    const data = await adminGraphql<{product: ProductNode | null}>(
      `#graphql
      query Verify($id: ID!) {
        product(id: $id) {
          id
          handle
          productType
          requestMoreImages: metafield(namespace: "custom", key: "request_more_images") { value }
          requestPrice: metafield(namespace: "custom", key: "request_price") { value }
        }
      }`,
      {id},
    );
    const p = data.product;
    if (!p) {
      verifyBad += 1;
      console.log(`  missing ${id}`);
      continue;
    }
    const ok = !needsUpdate(p);
    if (ok) verifyOk += 1;
    else verifyBad += 1;
    console.log(
      `  ${ok ? '✓' : '✗'} ${p.handle} department=${JSON.stringify(p.productType)} more_images=${p.requestMoreImages?.value ?? 'null'} request_price=${p.requestPrice?.value ?? 'null'}`,
    );
    await sleep(150);
  }

  // Count how many still need update after run
  console.log('\n--- Post-run recount (first 250 + rest) ---');
  const after = await listAllProducts();
  const stillNeed = after.filter(needsUpdate);
  const correct = after.length - stillNeed.length;

  console.log('\n========== SUMMARY ==========');
  console.log(`Total products:     ${products.length}`);
  console.log(`Already correct:    ${alreadyOk}`);
  console.log(`Updated this run:   ${updated}`);
  console.log(`Failed:             ${failed}`);
  console.log(`Post-run correct:   ${correct}/${after.length}`);
  console.log(`Post-run remaining: ${stillNeed.length}`);
  console.log(`Verify sample:      ${verifyOk} ok / ${verifyBad} bad`);
  if (failures.length) {
    console.log('Failures:');
    for (const f of failures) {
      console.log(`  - ${f.handle} (${f.id}): ${f.error}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
