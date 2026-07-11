/**
 * Align all solids-collection products to the agreed USD price card.
 *
 * FX: 1 USD = 95.37 INR
 * Cost (INR → USD): Stole 3500, Shawl 6800, Square 7500, 3 Yard 16500
 * Selling (USD): Stole 130, Shawl 190, Square 190, 3 Yard 475
 * Compare-at: selling + 30%
 *
 * Run: npx tsx scripts/update-solids-pricing.ts
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

const SHOP = process.env.PUBLIC_STORE_DOMAIN ?? '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
const API_VERSION = '2025-01';
const USD_PER_INR = 95.37;
const inrToUsd = (inr: number) =>
  (Math.round((inr / USD_PER_INR) * 100) / 100).toFixed(2);

const PRICING = [
  {
    match: /stole/i,
    cost: inrToUsd(3500),
    price: '130.00',
    compareAt: '169.00',
  },
  {
    match: /shawl/i,
    cost: inrToUsd(6800),
    price: '190.00',
    compareAt: '247.00',
  },
  {
    match: /square/i,
    cost: inrToUsd(7500),
    price: '190.00',
    compareAt: '247.00',
  },
  {
    match: /3\s*yard/i,
    cost: inrToUsd(16500),
    price: '475.00',
    compareAt: '617.50',
  },
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

if (!SHOP || !TOKEN) {
  console.error('Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN');
  process.exit(1);
}

async function adminGraphql(
  query: string,
  variables?: Record<string, unknown>,
  attempt = 0,
): Promise<any> {
  let res: Response;
  try {
    res = await fetch(
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
  } catch (err) {
    if (attempt < 3) {
      await sleep(2000 * (attempt + 1));
      return adminGraphql(query, variables, attempt + 1);
    }
    throw err;
  }
  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors.map((e: {message: string}) => e.message).join('; ');
    if (/throttl|rate|access token/i.test(msg) && attempt < 5) {
      const wait = 3000 * (attempt + 1);
      console.log(`  ⚠ rate-limit (attempt ${attempt + 1}); waiting ${wait}ms`);
      await sleep(wait);
      return adminGraphql(query, variables, attempt + 1);
    }
    throw new Error(msg);
  }
  return json.data;
}

function sizeKey(selectedOptions: Array<{name: string; value: string}>) {
  return (
    selectedOptions.find((o) => /size/i.test(o.name))?.value ??
    selectedOptions.map((o) => o.value).join(' ')
  );
}

function pricingForSize(size: string) {
  return PRICING.find((p) => p.match.test(size)) ?? null;
}

async function listSolidsProducts() {
  const products: Array<{id: string; handle: string; title: string}> = [];
  let cursor: string | null = null;
  do {
    const data = await adminGraphql(
      `#graphql
      query Solids($cursor: String) {
        collectionByHandle(handle: "solids") {
          products(first: 50, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes { id handle title }
          }
        }
      }`,
      {cursor},
    );
    const page = data.collectionByHandle.products;
    products.push(...page.nodes);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return products;
}

async function fetchVariants(productId: string) {
  const data = await adminGraphql(
    `#graphql
    query ProductVariants($id: ID!) {
      product(id: $id) {
        id
        variants(first: 20) {
          nodes {
            id
            selectedOptions { name value }
            inventoryItem { id }
          }
        }
      }
    }`,
    {id: productId},
  );
  return data.product.variants.nodes as Array<{
    id: string;
    selectedOptions: Array<{name: string; value: string}>;
    inventoryItem: {id: string};
  }>;
}

async function updateProductPricing(
  productId: string,
  variants: Array<{
    id: string;
    price: string;
    compareAtPrice: string;
    inventoryItemId: string;
    cost: string;
  }>,
) {
  const r1 = await adminGraphql(
    `#graphql
    mutation BulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id price compareAtPrice }
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: variants.map((v) => ({
        id: v.id,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
      })),
    },
  );
  const errs1 = r1?.productVariantsBulkUpdate?.userErrors ?? [];
  if (errs1.length) throw new Error(`price: ${errs1[0].message}`);

  for (const v of variants) {
    const r2 = await adminGraphql(
      `#graphql
      mutation UpdateCost($id: ID!, $input: InventoryItemInput!) {
        inventoryItemUpdate(id: $id, input: $input) {
          inventoryItem { id unitCost { amount } }
          userErrors { field message }
        }
      }`,
      {id: v.inventoryItemId, input: {cost: v.cost}},
    );
    const errs2 = r2?.inventoryItemUpdate?.userErrors ?? [];
    if (errs2.length) throw new Error(`cost: ${errs2[0].message}`);
  }
}

async function main() {
  console.log(`\n→ Updating solids pricing on ${SHOP}`);
  console.log('  FX: 1 USD = 95.37 INR');
  for (const p of PRICING) {
    console.log(
      `  ${p.match}: cost $${p.cost} | sell $${p.price} | compare $${p.compareAt}`,
    );
  }
  console.log();

  const products = await listSolidsProducts();
  console.log(`Found ${products.length} solids products\n`);

  let ok = 0;
  let skipped = 0;
  let errors = 0;
  const errorSamples: string[] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i]!;
    try {
      const nodes = await fetchVariants(product.id);
      const updates = [];
      for (const v of nodes) {
        const size = sizeKey(v.selectedOptions);
        const pricing = pricingForSize(size);
        if (!pricing) continue;
        updates.push({
          id: v.id,
          price: pricing.price,
          compareAtPrice: pricing.compareAt,
          inventoryItemId: v.inventoryItem.id,
          cost: pricing.cost,
        });
      }

      if (updates.length === 0) {
        skipped++;
        console.log(`  skip ${product.handle} (no size variants matched)`);
        continue;
      }

      await updateProductPricing(product.id, updates);
      ok++;
      if (ok % 25 === 0 || i === products.length - 1) {
        console.log(`  … ${ok}/${products.length} updated (at ${product.handle})`);
      }
      await sleep(120);
    } catch (err) {
      errors++;
      const msg = `${product.handle}: ${(err as Error).message}`;
      if (errorSamples.length < 10) errorSamples.push(msg);
      console.log(`  ! ${msg}`);
      await sleep(500);
    }
  }

  console.log(
    `\n→ Done. updated=${ok}, skipped=${skipped}, errors=${errors}`,
  );
  if (errorSamples.length) {
    console.log('Error samples:');
    for (const s of errorSamples) console.log(`  ${s}`);
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message ?? err);
  process.exit(1);
});
