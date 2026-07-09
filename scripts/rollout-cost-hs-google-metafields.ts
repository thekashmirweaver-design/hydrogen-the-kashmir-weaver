/**
 * Bulk rollout to ALL products in the store (gid://shopify/Product/{id}).
 *
 * Per product:
 *   1. Update inventory items on existing variants (Stole/Shawl/Square):
 *      - cost (INR → USD @ 83):  ₹3,500 → $42.17, ₹6,800 → $81.93, ₹7,500 → $90.36
 *      - countryCodeOfOrigin: "IN"
 *      - harmonizedSystemCode: "6214.20"
 *      - measurement.weight: per weightGramsForSizeLabel (Stole 180g, Shawl 220g, Square 200g)
 *   2. If product doesn't yet have a "3 Yard (137 × 274 cm)" variant: add it
 *      - SKU: derived from existing product prefix, suffix -XL
 *      - barcode = SKU
 *      - tracked = false
 *      - cost $198.80, price $542.17, compareAt $813.25
 *      - inventoryItem: weight 300g, country=IN, HS=6214.20
 *   3. Set mm-google-shopping.{age_group,condition,gender,mpn} on every variant:
 *      adult / new / unisex / <own sku>
 *
 * Run: npx tsx scripts/rollout-cost-hs-google-metafields.ts
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {weightGramsForSizeLabel} from '../app/models/product-accordion-content.ts';

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
const DUMMY_TEST_HANDLE = 'test-all-fields';

const USD_TO_INR = 83;
const inrToUsd = (inr) => Math.round((inr / USD_TO_INR) * 100) / 100;

const COST_USD_BY_SIZE = {
  Stole: inrToUsd(3500),
  Shawl: inrToUsd(6800),
  Square: inrToUsd(7500),
  ThreeYard: inrToUsd(16500),
};

const THREE_YARD = {
  label: '3 Yard',
  dimensionCm: '137 × 274 cm',
  weightGrams: 300,
  country: 'IN',
  hs: '6214.20',
  costUsd: COST_USD_BY_SIZE.ThreeYard,
  priceUsd: inrToUsd(45000),
  compareAtUsd: inrToUsd(67500),
};

const GOOGLE = {age_group: 'adult', condition: 'new', gender: 'unisex'};

const SIZE_LABELS = {
  Stole: 'Stole (70 X 200cm)',
  Shawl: 'Shawl (100×200cm)',
  Square: 'Square Scarf (137×137cm)',
  ThreeYard: `${THREE_YARD.label} (${THREE_YARD.dimensionCm})`,
};

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
  const text = await res.text();
  let json;
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
    if (
      /access token|throttl|rate/i.test(msg) &&
      attempt < 5
    ) {
      const wait = 3000 * (attempt + 1);
      console.log(`  ⚠ rate-limit/auth error (attempt ${attempt + 1}); waiting ${wait}ms`);
      await sleep(wait);
      return adminGraphql(query, variables, attempt + 1);
    }
    throw new Error(msg);
  }
  return json.data;
}

async function listAllProducts() {
  const products = [];
  let cursor = null;
  let page = 0;
  do {
    try {
      const data = await adminGraphql(
        `#graphql
        query ListProducts($cursor: String) {
          products(first: 50, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes { id handle title }
          }
        }`,
        {cursor},
      );
      if (!data?.products?.nodes) {
        console.error(`  ! page ${page}: unexpected response shape`, JSON.stringify(data).slice(0, 300));
        break;
      }
      products.push(...data.products.nodes);
      cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
      page++;
    } catch (err) {
      console.error(`  ! page ${page} error:`, (err as Error).message);
      break;
    }
  } while (cursor);
  return products;
}

async function fetchProductFull(productId) {
  const data = await adminGraphql(
    `#graphql
    query GetProductFull($id: ID!) {
      product(id: $id) {
        id handle title
        options { id name values }
        variants(first: 50) {
          nodes {
            id title sku barcode price compareAtPrice
            selectedOptions { name value }
            inventoryItem {
              id tracked
              unitCost { amount currencyCode }
              countryCodeOfOrigin
              harmonizedSystemCode
              measurement { weight { value unit } }
            }
          }
        }
      }
    }`,
    {id: productId},
  );
  return data.product;
}

async function updateInventoryItem({id, country, hs, weightGrams, costUsd}) {
  const input = {
    countryCodeOfOrigin: country,
    harmonizedSystemCode: hs,
    measurement: {weight: {value: weightGrams, unit: 'GRAMS'}},
  };
  if (costUsd != null) input.cost = costUsd.toFixed(2);
  return adminGraphql(
    `#graphql
    mutation UpdateItem($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem {
          id unitCost { amount currencyCode }
          countryCodeOfOrigin
          harmonizedSystemCode
          measurement { weight { value unit } }
        }
        userErrors { field message }
      }
    }`,
    {id, input},
  );
}

async function addThreeYardVariant(productId, colorValue, newSku) {
  const newSizeValue = SIZE_LABELS.ThreeYard;
  const optionValues = [];
  if (colorValue) {
    optionValues.push({optionName: 'Color', name: colorValue});
  }
  optionValues.push({optionName: 'Accessory size', name: newSizeValue});

  return adminGraphql(
    `#graphql
    mutation AddVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants) {
        productVariants {
          id title sku barcode price compareAtPrice
          inventoryItem {
            id unitCost { amount currencyCode }
            tracked requiresShipping
            countryCodeOfOrigin harmonizedSystemCode
            measurement { weight { value unit } }
          }
        }
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: [
        {
          optionValues,
          price: THREE_YARD.priceUsd.toFixed(2),
          compareAtPrice: THREE_YARD.compareAtUsd.toFixed(2),
          barcode: newSku,
          inventoryItem: {
            tracked: false,
            requiresShipping: true,
            sku: newSku,
            cost: THREE_YARD.costUsd.toFixed(2),
            countryCodeOfOrigin: THREE_YARD.country,
            harmonizedSystemCode: THREE_YARD.hs,
            measurement: {weight: {value: THREE_YARD.weightGrams, unit: 'GRAMS'}},
          },
        },
      ],
    },
  );
}

/**
 * Fallback: when the product's "Accessory size" option is linked to a metafield,
 * `productVariantsBulkCreate` refuses a new linked value because existing values
 * are non-linked. Fix by creating a 3 Yard metaobject, then calling productSet
 * with linkedMetafield.values including the new metaobject + the new variant.
 */
async function addThreeYardViaLinkedMetafield(product, colorValue, byLabel, full, newSku) {
  const sizeOption = full.options.find((o) => o.name === 'Accessory size');
  if (!sizeOption) throw new Error(`${product.handle}: no Accessory size option`);

  // 1. Create the metaobject for 3 Yard (use existing "Other" taxonomy as fallback).
  const createResult = await adminGraphql(
    `mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id handle }
        userErrors { field message }
      }
    }`,
    {
      metaobject: {
        type: 'shopify--accessory-size',
        handle: 'three-yard',
        fields: [
          {key: 'label', value: SIZE_LABELS.ThreeYard},
          {key: 'taxonomy_reference', value: 'gid://shopify/TaxonomyValue/26417'},
        ],
      },
    },
  );
  const newMetaobjErrors = createResult?.metaobjectCreate?.userErrors ?? [];
  if (newMetaobjErrors.length && !/taken/i.test(newMetaobjErrors[0].message)) {
    throw new Error(`${product.handle} metaobj: ${newMetaobjErrors[0].message}`);
  }
  // If it was TAKEN, fetch the existing one.
  let newMetaobjId;
  if (newMetaobjErrors.some((e) => /taken/i.test(e.message))) {
    const existingResult = await adminGraphql(
      `query($handle: String!) {
        metaobjectByHandle(handle: $handle) { id }
      }`,
      {handle: 'three-yard'},
    );
    newMetaobjId = existingResult?.metaobjectByHandle?.id;
    if (!newMetaobjId) throw new Error(`${product.handle}: metaobject three-yard not found`);
  } else {
    newMetaobjId = createResult.metaobjectCreate.metaobject.id;
  }

  // 2. Build productSet input with linkedMetafield + 4 variants.
  const optionId = sizeOption.id;
  const existingOptionValues = await adminGraphql(
    `query($id: ID!) {
      product(id: $id) {
        options {
          id name
          linkedMetafield { namespace key }
          optionValues { id name linkedMetafieldValue }
        }
      }
    }`,
    {id: product.id},
  );
  const opt = existingOptionValues?.product?.options?.[0];
  const existingValues = opt?.optionValues ?? [];
  const linkedMetaobjIds = [
    ...existingValues.map((v) => v.linkedMetafieldValue).filter(Boolean),
    newMetaobjId,
  ];

  const variantInputs = [];
  for (const [key, label] of [
    ['Stole', SIZE_LABELS.Stole],
    ['Shawl', SIZE_LABELS.Shawl],
    ['Square', SIZE_LABELS.Square],
  ]) {
    const v = byLabel[label];
    const grams = weightGramsForSizeLabel(label);
    const ovId = existingValues.find((ov) => ov.name === label)?.id;
    variantInputs.push({
      optionValues: [{optionId, id: ovId, name: label}],
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      barcode: v.sku,
      inventoryItem: {
        sku: v.sku,
        cost: COST_USD_BY_SIZE[key].toFixed(2),
        countryCodeOfOrigin: THREE_YARD.country,
        harmonizedSystemCode: THREE_YARD.hs,
        measurement: {weight: {value: grams, unit: 'GRAMS'}},
      },
    });
  }
  variantInputs.push({
    optionValues: [{optionId, name: SIZE_LABELS.ThreeYard, linkedMetafieldValue: newMetaobjId}],
    price: THREE_YARD.priceUsd.toFixed(2),
    compareAtPrice: THREE_YARD.compareAtUsd.toFixed(2),
    barcode: newSku,
    inventoryItem: {
      tracked: false,
      requiresShipping: true,
      sku: newSku,
      cost: THREE_YARD.costUsd.toFixed(2),
      countryCodeOfOrigin: THREE_YARD.country,
      harmonizedSystemCode: THREE_YARD.hs,
      measurement: {weight: {value: THREE_YARD.weightGrams, unit: 'GRAMS'}},
    },
  });

  const setResult = await adminGraphql(
    `mutation SetProduct($input: ProductSetInput!) {
      productSet(synchronous: true, input: $input) {
        product { id handle variants(first: 10) { nodes { sku } } }
        userErrors { field message }
      }
    }`,
    {
      input: {
        id: product.id,
        productOptions: [
          {
            id: optionId,
            name: 'Accessory size',
            linkedMetafield: {
              namespace: opt.linkedMetafield.namespace,
              key: opt.linkedMetafield.key,
              values: linkedMetaobjIds,
            },
          },
        ],
        variants: variantInputs,
      },
    },
  );
  const setErrors = setResult?.productSet?.userErrors ?? [];
  if (setErrors.length) throw new Error(`${product.handle} productSet: ${setErrors[0].message}`);
}

async function setVariantGoogleMetafields(variants) {
  const entries = [];
  for (const v of variants) {
    if (!v.sku) continue;
    entries.push(
      {ownerId: v.id, namespace: 'mm-google-shopping', key: 'age_group', type: 'single_line_text_field', value: GOOGLE.age_group},
      {ownerId: v.id, namespace: 'mm-google-shopping', key: 'condition', type: 'single_line_text_field', value: GOOGLE.condition},
      {ownerId: v.id, namespace: 'mm-google-shopping', key: 'gender', type: 'single_line_text_field', value: GOOGLE.gender},
      {ownerId: v.id, namespace: 'mm-google-shopping', key: 'mpn', type: 'single_line_text_field', value: v.sku},
    );
  }
  return adminGraphql(
    `#graphql
    mutation SetVariantMetas($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {metafields: entries},
  );
}

function deriveNewSkuPrefix(variantSku) {
  if (!variantSku) return null;
  const m = variantSku.match(/^(.*)-[A-Z]+$/);
  return m ? m[1] : null;
}

function summarizeSizeMatches(variants) {
  const map = {};
  for (const v of variants) {
    const acc = v.selectedOptions.find((o) => o.name === 'Accessory size')?.value;
    if (acc) map[acc] = v;
  }
  return map;
}

async function processProduct(product, summary) {
  if (product.handle === DUMMY_TEST_HANDLE) {
    summary.skippedDummy++;
    summary.log.push(`  · skip ${product.handle} (dummy test product)`);
    return;
  }

  const full = await fetchProductFull(product.id);

  const byLabel = summarizeSizeMatches(full.variants.nodes);
  const expectedLabels = [SIZE_LABELS.Stole, SIZE_LABELS.Shawl, SIZE_LABELS.Square];
  const hasAllThree = expectedLabels.every((l) => byLabel[l] != null);

  if (!hasAllThree) {
    summary.skippedMismatch++;
    summary.log.push(`  · skip ${product.handle} (missing expected sizes; found: ${Object.keys(byLabel).join(', ')})`);
    return;
  }

  const colorValue = full.variants.nodes[0].selectedOptions.find((o) => o.name === 'Color')?.value ?? null;

  // 1. Update existing 3 inventory items (Stole / Shawl / Square)
  const sizeUpdates = [
    {key: 'Stole', label: SIZE_LABELS.Stole},
    {key: 'Shawl', label: SIZE_LABELS.Shawl},
    {key: 'Square', label: SIZE_LABELS.Square},
  ];
  for (const {key, label} of sizeUpdates) {
    const v = byLabel[label];
    const grams = weightGramsForSizeLabel(label);
    if (grams == null) throw new Error(`${product.handle}: missing weight mapping for ${label}`);
    const r = await updateInventoryItem({
      id: v.inventoryItem.id,
      costUsd: COST_USD_BY_SIZE[key],
      country: THREE_YARD.country,
      hs: THREE_YARD.hs,
      weightGrams: grams,
    });
    const errs = r.data?.inventoryItemUpdate?.userErrors ?? [];
    if (errs.length) throw new Error(`${product.handle} ${key}: ${errs[0].message}`);
  }

  // 1b. If 3 Yard variant already exists, also normalize its inventory item
  const existingThreeYard = byLabel[SIZE_LABELS.ThreeYard];
  if (existingThreeYard) {
    const r = await updateInventoryItem({
      id: existingThreeYard.inventoryItem.id,
      costUsd: COST_USD_BY_SIZE.ThreeYard,
      country: THREE_YARD.country,
      hs: THREE_YARD.hs,
      weightGrams: THREE_YARD.weightGrams,
    });
    const errs = r.data?.inventoryItemUpdate?.userErrors ?? [];
    if (errs.length) throw new Error(`${product.handle} ThreeYard-inv: ${errs[0].message}`);
  }

  // 2. Add 3 Yard variant if not present
  const sizeOption = full.options.find((o) => o.name === 'Accessory size');
  let needsRefresh = false;
  if (!sizeOption?.values?.includes(SIZE_LABELS.ThreeYard)) {
    const baseSku = deriveNewSkuPrefix(byLabel[SIZE_LABELS.Stole].sku);
    if (!baseSku) {
      summary.skippedMismatch++;
      summary.log.push(`  · skip ${product.handle} (cannot derive SKU prefix from ${byLabel[SIZE_LABELS.Stole].sku})`);
      return;
    }
    const newSku = `${baseSku}-XL`;
    try {
      const r = await addThreeYardVariant(product.id, colorValue, newSku);
      const errs = r.data?.productVariantsBulkCreate?.userErrors ?? [];
      if (errs.length) throw new Error(errs[0].message);
      needsRefresh = true;
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      if (/linked to a metafield|nonlinked option values/i.test(msg)) {
        await addThreeYardViaLinkedMetafield(product, colorValue, byLabel, full, newSku);
        needsRefresh = true;
      } else {
        throw new Error(`${product.handle} 3Yard add: ${msg}`);
      }
    }
  }

  // 3. Set Google metafields on all variants
  const refreshed = needsRefresh ? await fetchProductFull(product.id) : full;
  const r = await setVariantGoogleMetafields(refreshed.variants.nodes);
  const errs = r.data?.metafieldsSet?.userErrors ?? [];
  if (errs.length) throw new Error(`${product.handle} metafields: ${errs[0].message}`);

  summary.updated++;
}

async function main() {
  console.log(`\n→ Bulk rollout starting on ${SHOP}\n`);
  const t0 = Date.now();

  const summary = {
    total: 0,
    updated: 0,
    skippedDummy: 0,
    skippedMismatch: 0,
    errors: 0,
    log: [],
  };

  // Pull all products
  let all = await listAllProducts();
  summary.total = all.length;
  console.log(`→ Found ${all.length} products\n`);

  // Optional limit for dry-run testing
  const dryRunLimit = process.env.ROLLOUT_LIMIT ? Number(process.env.ROLLOUT_LIMIT) : 0;
  if (dryRunLimit > 0) {
    all = all.slice(0, dryRunLimit);
    console.log(`  (dry-run: limited to first ${dryRunLimit} products)\n`);
  }

  // Skip the 2 test products already handled (if any)
  const alreadyHandled = new Set([
    'gid://shopify/Product/9324351652055',
    'gid://shopify/Product/9324351520983',
  ]);

  // Resume support: skip products already updated in a prior run
  const {existsSync, readFileSync, writeFileSync} = await import('node:fs');
  const progressPath = '/tmp/rollout-progress.txt';
  const alreadyDone = new Set<string>();
  if (existsSync(progressPath)) {
    for (const line of readFileSync(progressPath, 'utf8').split('\n')) {
      if (line.trim()) alreadyDone.add(line.trim());
    }
    console.log(`  (resuming: ${alreadyDone.size} products already completed)\n`);
  }

  let i = 0;
  for (const p of all) {
    i++;
    if (alreadyHandled.has(p.id)) {
      summary.log.push(`  · skip ${p.handle} (already handled in test runs)`);
      continue;
    }
    if (alreadyDone.has(p.id)) {
      summary.updated++;
      continue;
    }
    try {
      await processProduct(p, summary);
      alreadyDone.add(p.id);
      writeFileSync(progressPath, [...alreadyDone].join('\n') + '\n');
      if (summary.updated % 25 === 0 && summary.updated > 0) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`  … progress: ${summary.updated}/${all.length - alreadyHandled.size} (${elapsed}s elapsed)`);
      }
    } catch (err) {
      summary.errors++;
      summary.log.push(`  ✗ ${p.handle} (${p.id}): ${(err as Error).message ?? err}`);
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n→ Complete.');
  console.log(`  total products:       ${summary.total}`);
  console.log(`  updated:              ${summary.updated}`);
  console.log(`  skipped (dummy):      ${summary.skippedDummy}`);
  console.log(`  skipped (mismatch):   ${summary.skippedMismatch}`);
  console.log(`  skipped (handled):    2`);
  console.log(`  errors:               ${summary.errors}`);
  console.log(`  elapsed:              ${elapsed}s\n`);

  const errorLines = summary.log.filter((l) => l.startsWith('  ✗'));
  const skipLines = summary.log.filter((l) => l.startsWith('  · skip'));
  if (errorLines.length) {
    console.log(`Errors (${errorLines.length}):`);
    for (const line of errorLines.slice(0, 20)) console.log(line);
    if (errorLines.length > 20) console.log(`  ... and ${errorLines.length - 20} more`);
  }
  if (skipLines.length) {
    console.log(`\nSkipped products (${skipLines.length}):`);
    for (const line of skipLines.slice(0, 20)) console.log(line);
    if (skipLines.length > 20) console.log(`  ... and ${skipLines.length - 20} more`);
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message ?? err);
  process.exit(1);
});
