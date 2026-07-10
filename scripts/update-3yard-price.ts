/**
 * Update cost + price on every 3 Yard (137 × 274 cm) variant across all products.
 *
 * - Cost: $175 (stored on inventoryItem.cost, USD)
 * - Selling price: $475 (stored on variant.price, USD)
 * - compareAtPrice left untouched.
 *
 * Run: npx tsx scripts/update-3yard-price.ts
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
    )
      value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile();

const SHOP = process.env.PUBLIC_STORE_DOMAIN ?? '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
const API_VERSION = '2025-01';

const NEW_COST_USD = '175.00';
const NEW_PRICE_USD = '475.00';
const SIZE_VALUE = '3 Yard (137 × 274 cm)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!SHOP || !TOKEN) {
  console.error('Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN');
  process.exit(1);
}

async function adminGraphql(query, variables, attempt = 0) {
  let res;
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
    const msg = json.errors.map((e) => e.message).join('; ');
    if (/access token|throttl|rate/i.test(msg) && attempt < 5) {
      const wait = 3000 * (attempt + 1);
      console.log(`  ⚠ rate-limit/auth (attempt ${attempt + 1}); waiting ${wait}ms`);
      await sleep(wait);
      return adminGraphql(query, variables, attempt + 1);
    }
    throw new Error(msg);
  }
  return json.data;
}

async function listAllThreeYardVariants() {
  const items = [];
  let cursor = null;
  do {
    const data = await adminGraphql(
      `#graphql
      query List3Yard($cursor: String, $q: String!) {
        productVariants(first: 50, after: $cursor, query: $q) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id sku title price
            product { id }
            selectedOptions { name value }
            inventoryItem { id }
          }
        }
      }`,
      {cursor, q: 'variant_title:3 Yard'},
    );
    items.push(...data.productVariants.nodes);
    cursor = data.productVariants.pageInfo.hasNextPage ? data.productVariants.pageInfo.endCursor : null;
  } while (cursor);
  return items;
}

async function updateVariantsBulk(productId, variantUpdates) {
  return adminGraphql(
    `mutation UpdateBulk($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id sku price }
        userErrors { field message }
      }
    }`,
    {productId, variants: variantUpdates},
  );
}

async function updateInventoryCost(inventoryItemId, cost) {
  return adminGraphql(
    `mutation UpdateItem($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem { id unitCost { amount currencyCode } }
        userErrors { field message }
      }
    }`,
    {id: inventoryItemId, input: {cost}},
  );
}

async function main() {
  console.log(`\n→ Updating all 3 Yard variants on ${SHOP}\n`);
  console.log(`  cost: ${NEW_COST_USD}  price: ${NEW_PRICE_USD} USD\n`);

  const variants = await listAllThreeYardVariants();
  console.log(`Found ${variants.length} 3 Yard variants\n`);

  // Group by product
  const byProduct = new Map();
  for (const v of variants) {
    const pid = v.product.id;
    if (!byProduct.has(pid)) byProduct.set(pid, []);
    byProduct.get(pid).push(v);
  }

  let updatedPrice = 0;
  let updatedCost = 0;
  let errors = 0;
  const errorSamples = [];

  for (const [productId, vs] of byProduct) {
    try {
      const variantInputs = vs.map((v) => ({
        id: v.id,
        price: NEW_PRICE_USD,
      }));
      const r1 = await updateVariantsBulk(productId, variantInputs);
      const errs1 = r1?.productVariantsBulkUpdate?.userErrors ?? [];
      if (errs1.length) throw new Error(`price: ${errs1[0].message}`);
      updatedPrice += vs.length;

      for (const v of vs) {
        const r2 = await updateInventoryCost(v.inventoryItem.id, NEW_COST_USD);
        const errs2 = r2?.inventoryItemUpdate?.userErrors ?? [];
        if (errs2.length) throw new Error(`cost ${v.sku}: ${errs2[0].message}`);
        updatedCost++;
      }

      if ((updatedPrice) % 50 === 0) console.log(`  … ${updatedPrice}/${variants.length} priced`);
    } catch (err) {
      errors++;
      if (errorSamples.length < 5) errorSamples.push(`product ${productId}: ${(err as Error).message}`);
    }
  }

  console.log(`\n→ Done. priced=${updatedPrice}, cost=${updatedCost}, errors=${errors}`);
  if (errorSamples.length) {
    console.log('Error samples:');
    for (const s of errorSamples) console.log(`  ${s}`);
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message ?? err);
  process.exit(1);
});